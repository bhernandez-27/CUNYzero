import { NextResponse } from "next/server";

/**
 * Base URL of the Python auth service (no trailing slash).
 * Example: http://localhost:8000
 *
 * Python should expose (same paths relative to this base):
 * - POST /auth/login    — body: { email, password, remember?: boolean }
 * - POST /auth/register — body: { email, password, name, role: "student" | "instructor" }
 * - POST /auth/logout   — body: optional {}, may use session cookie
 *
 * Responses: JSON is proxied as-is. Use HTTP status 4xx/5xx for errors with JSON like
 * { "error": "invalid_credentials", "message": "..." }.
 * For cookie sessions, return Set-Cookie on success; Next forwards those headers to the browser.
 */
export function getAuthPythonBaseUrl(): string | null {
  const url = process.env.AUTH_PYTHON_BASE_URL?.trim();
  if (!url) return null;
  return url.replace(/\/+$/, "");
}

function appendForwardedSetCookie(upstream: Response, res: NextResponse) {
  const h = upstream.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === "function") {
    for (const c of h.getSetCookie()) {
      res.headers.append("Set-Cookie", c);
    }
    return;
  }
  const single = upstream.headers.get("set-cookie");
  if (single) res.headers.append("Set-Cookie", single);
}

export async function proxyJsonToPython(path: string, json: unknown, incoming?: Request): Promise<NextResponse> {
  const base = getAuthPythonBaseUrl();
  if (!base) {
    return NextResponse.json(
      {
        error: "auth_backend_not_configured",
        message:
          "Set AUTH_PYTHON_BASE_URL in .env.local to your Python service root (e.g. http://localhost:8000).",
        pythonShouldImplement: {
          login: "POST {AUTH_PYTHON_BASE_URL}/auth/login",
          register: "POST {AUTH_PYTHON_BASE_URL}/auth/register",
          logout: "POST {AUTH_PYTHON_BASE_URL}/auth/logout",
        },
      },
      { status: 503 },
    );
  }

  const target = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const cookie = incoming?.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15_000);
    upstream = await fetch(target, {
      method: "POST",
      headers,
      body: JSON.stringify(json),
      signal: controller.signal,
    });
    clearTimeout(t);
  } catch (e) {
    console.error("[auth proxy] upstream fetch failed:", e);
    return NextResponse.json(
      { error: "auth_upstream_unreachable", message: "Could not reach the Python auth service." },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "application/json";
  const body = await upstream.arrayBuffer();
  const res = new NextResponse(body, {
    status: upstream.status,
    statusText: upstream.statusText,
  });
  res.headers.set("content-type", contentType);
  appendForwardedSetCookie(upstream, res);
  return res;
}
