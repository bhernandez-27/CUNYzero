import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import { getSession } from "@/lib/auth/session";

/*
 * Proxies to Python:
 *   GET {AUTH_PYTHON_BASE_URL}/check-conflict?student_id={id}&new_class_id={classId}
 *
 * Success (200): { conflict: boolean, message?: string }
 * Error  (404):  class schedule not found in DB
 *
 * When Python is unreachable or not configured, returns { conflict: false }
 * so the client-side check (already run before this call) remains the fallback.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("class_id");

  if (!classId) {
    return NextResponse.json({ error: "missing class_id" }, { status: 400 });
  }

  const base = getAuthPythonBaseUrl();
  if (!base) {
    return NextResponse.json({ conflict: false });
  }

  const session = await getSession();
  // dev-001 / dev-ins are non-numeric — fall back to id 1 so Python doesn't 422
  const rawId = session?.id ?? "1";
  const studentId = /^\d+$/.test(rawId) ? rawId : "1";

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8_000);
    const upstream = await fetch(
      `${base}/check-conflict?student_id=${encodeURIComponent(studentId)}&new_class_id=${encodeURIComponent(classId)}`,
      { headers, signal: controller.signal },
    );
    clearTimeout(t);

    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    console.warn("[registration/check-conflict] Python unreachable, skipping DB conflict check");
    return NextResponse.json({ conflict: false });
  }
}
