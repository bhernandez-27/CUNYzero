import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";

function isValidGpa(n: number): boolean {
  return Number.isFinite(n) && n >= 0 && n <= 4;
}

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

  const b = body as Record<string, unknown>;
  const fullName = typeof b.fullName === "string" ? b.fullName.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const priorGpaRaw = b.priorGpa;
  const priorGpa = typeof priorGpaRaw === "number" ? priorGpaRaw : Number(priorGpaRaw);

  if (!fullName || fullName.length > 200) {
    return NextResponse.json({ error: "validation_error", message: "Full name is required." }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "validation_error", message: "A valid email is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "validation_error", message: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }
  if (!isValidGpa(priorGpa)) {
    return NextResponse.json(
      { error: "validation_error", message: "Prior GPA must be a number between 0 and 4.0." },
      { status: 400 },
    );
  }

  const payload = {
    fullName,
    email,
    password,
    priorGpa,
    phone: typeof b.phone === "string" ? b.phone.trim() || undefined : undefined,
    street: typeof b.street === "string" ? b.street.trim() || undefined : undefined,
    city: typeof b.city === "string" ? b.city.trim() || undefined : undefined,
    state: typeof b.state === "string" ? b.state.trim() || undefined : undefined,
    postalCode: typeof b.postalCode === "string" ? b.postalCode.trim() || undefined : undefined,
  };

  const base = getAuthPythonBaseUrl();
  if (!base) {
    return NextResponse.json(
      {
        error: "auth_backend_not_configured",
        message:
          "Set AUTH_PYTHON_BASE_URL in .env.local to your Python service root (e.g. http://localhost:8000).",
      },
      { status: 503 },
    );
  }

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15_000);
    upstream = await fetch(`${base}/applications/student`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(t);
  } catch {
    return NextResponse.json(
      { error: "upstream_unreachable", message: "Could not reach the application service." },
      { status: 502 },
    );
  }

  const rawText = await upstream.text();
  if (!upstream.ok) {
    let message = "Submission failed. Try again.";
    try {
      const parsed = JSON.parse(rawText);
      if (typeof parsed?.detail === "string") message = parsed.detail;
      else if (typeof parsed?.message === "string") message = parsed.message;
    } catch {
      // leave default message
    }
    return NextResponse.json({ error: "upstream_error", message }, { status: upstream.status });
  }

  let parsed: { ok?: boolean; applicationId?: string; message?: string } = {};
  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = {};
  }
  return NextResponse.json({
    ok: true as const,
    applicationId: parsed.applicationId ?? "",
    message:
      parsed.message ??
      "Your application was received. Sign in with the same email and password to track its status.",
  });
}
