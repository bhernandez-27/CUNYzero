import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";

const ROLES = new Set(["student", "instructor"]);

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Request body must be JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body", message: "Expected a JSON object." }, { status: 400 });
  }

  const { email, password, name, role } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
    return NextResponse.json(
      { error: "validation_error", message: "Fields email, password, and name are required strings." },
      { status: 400 },
    );
  }

  const roleStr = typeof role === "string" ? role : "student";
  if (!ROLES.has(roleStr)) {
    return NextResponse.json(
      { error: "validation_error", message: 'role must be "student" or "instructor".' },
      { status: 400 },
    );
  }

  const payload = { email: email.trim(), password, name: name.trim(), role: roleStr };

  const base = getAuthPythonBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "auth_backend_not_configured", message: "Set AUTH_PYTHON_BASE_URL in .env.local." },
      { status: 503 },
    );
  }

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15_000);
    upstream = await fetch(`${base}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(t);
  } catch {
    return NextResponse.json(
      { error: "auth_upstream_unreachable", message: "Could not reach the Python auth service." },
      { status: 502 },
    );
  }

  const rawText = await upstream.text();
  const contentType = upstream.headers.get("content-type") ?? "application/json";

  const res = new NextResponse(rawText, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: { "content-type": contentType },
  });

  // On success, set the session cookie so the user is immediately logged in.
  if (upstream.ok && contentType.includes("application/json")) {
    try {
      const data = JSON.parse(rawText) as Record<string, unknown>;
      const id = String(data.id ?? "");
      const userName = String(data.name ?? name.trim());
      const userRole = String(data.role ?? roleStr);

      res.cookies.set("college0_user", JSON.stringify({ id, name: userName, role: userRole }), {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        secure: process.env.NODE_ENV === "production",
      });
    } catch {
      // If parsing fails, user will just need to log in manually.
    }
  }

  return res;
}
