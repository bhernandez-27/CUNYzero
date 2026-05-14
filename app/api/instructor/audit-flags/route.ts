import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import { getSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  const base = getAuthPythonBaseUrl();
  if (!base) return NextResponse.json([]);

  const session = await getSession();
  const instructorId = session?.id ?? "";

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    const upstream = await fetch(
      `${base}/instructor/audit-flags?instructor_id=${encodeURIComponent(instructorId)}`,
      { headers, signal: controller.signal },
    );
    clearTimeout(t);
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json(
      { error: "upstream_unreachable", message: "Could not reach the backend." },
      { status: 502 },
    );
  }
}
