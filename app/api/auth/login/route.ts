import { NextResponse } from "next/server";
import { proxyJsonToPython } from "@/lib/auth/proxyUpstream";

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

  const { email, password, remember } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "validation_error", message: "Fields email and password are required strings." },
      { status: 400 },
    );
  }

  const payload = {
    email: email.trim(),
    password,
    remember: Boolean(remember),
  };

  return proxyJsonToPython("/auth/login", payload, req);
}
