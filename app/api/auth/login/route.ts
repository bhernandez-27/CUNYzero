import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be JSON." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "invalid_body", message: "Expected a JSON object." },
      { status: 400 },
    );
  }

  const { email, password, remember } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "validation_error", message: "Fields email and password are required strings." },
      { status: 400 },
    );
  }

  const base = getAuthPythonBaseUrl();
  if (!base) {
    return NextResponse.json(
      {
        error: "auth_backend_not_configured",
        message: "Set AUTH_PYTHON_BASE_URL in .env.local to your Python service root.",
      },
      { status: 503 },
    );
  }

  const forwardCookie = req.headers.get("cookie");
  const fetchHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (forwardCookie) fetchHeaders.Cookie = forwardCookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15_000);
    upstream = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: fetchHeaders,
      body: JSON.stringify({ email: email.trim(), password, remember: Boolean(remember) }),
      signal: controller.signal,
    });
    clearTimeout(t);
  } catch {
    return NextResponse.json(
      { error: "auth_upstream_unreachable", message: "Could not reach the Python auth service." },
      { status: 502 },
    );
  }

  // Read the body once as text so we can both forward it and parse it.
  const rawText = await upstream.text();
  const contentType = upstream.headers.get("content-type") ?? "application/json";

  const res = new NextResponse(rawText, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: { "content-type": contentType },
  });

  // Forward Python's own Set-Cookie headers (their session cookie).
  const h = upstream.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === "function") {
    for (const c of h.getSetCookie()) res.headers.append("Set-Cookie", c);
  } else {
    const single = upstream.headers.get("set-cookie");
    if (single) res.headers.append("Set-Cookie", single);
  }

  // On success, parse the response to extract user info and set our session cookie.
  if (upstream.ok && contentType.includes("application/json")) {
    try {
      const data = JSON.parse(rawText) as Record<string, unknown>;
      const role = (data.role as string) ?? "student";
      const name = (data.name as string) ?? (data.email as string) ?? "User";
      const id = String(data.id ?? "");
      // 30-day expiry if "remember me", otherwise a 24-hour session cookie.
      const maxAge = Boolean(remember) ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
      res.cookies.set("college0_user", JSON.stringify({ id, name, role }), {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge,
        secure: process.env.NODE_ENV === "production",
      });
    } catch {
      // If Python's body isn't JSON we still return their response; just no session cookie.
    }
  }

  return res;
}
