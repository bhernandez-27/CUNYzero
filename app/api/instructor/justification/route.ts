import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import { getSession } from "@/lib/auth/session";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Request body must be JSON." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const classId = b.class_id;
  const justificationText = typeof b.justification_text === "string" ? b.justification_text.trim() : "";

  if (!classId || !justificationText) {
    return NextResponse.json(
      { error: "missing_field", message: "class_id and justification_text are required." },
      { status: 400 },
    );
  }

  const base = getAuthPythonBaseUrl();
  if (!base) {
    return NextResponse.json({ status: "OK", message: "Justification submitted. (dev mode)" });
  }

  const session = await getSession();
  const instructorId = session?.id ?? "";

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    const upstream = await fetch(`${base}/instructor/justification`, {
      method: "POST",
      headers,
      body: JSON.stringify({ class_id: classId, instructor_id: instructorId, justification_text: justificationText }),
      signal: controller.signal,
    });
    clearTimeout(t);
    const responseBody = await upstream.text();
    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json(
      { error: "upstream_unreachable", message: "Could not reach the backend. Try again." },
      { status: 502 },
    );
  }
}
