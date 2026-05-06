import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { StudentApplicationPayload } from "@/lib/applications/types";

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
  const priorGpaRaw = b.priorGpa;
  const priorGpa = typeof priorGpaRaw === "number" ? priorGpaRaw : Number(priorGpaRaw);

  if (!fullName || fullName.length > 200) {
    return NextResponse.json({ error: "validation_error", message: "Full name is required." }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "validation_error", message: "A valid email is required." }, { status: 400 });
  }
  if (!isValidGpa(priorGpa)) {
    return NextResponse.json(
      { error: "validation_error", message: "Prior GPA must be a number between 0 and 4.0." },
      { status: 400 },
    );
  }

  const payload: StudentApplicationPayload = {
    fullName,
    email,
    phone: typeof b.phone === "string" ? b.phone.trim() || undefined : undefined,
    street: typeof b.street === "string" ? b.street.trim() || undefined : undefined,
    city: typeof b.city === "string" ? b.city.trim() || undefined : undefined,
    state: typeof b.state === "string" ? b.state.trim() || undefined : undefined,
    postalCode: typeof b.postalCode === "string" ? b.postalCode.trim() || undefined : undefined,
    priorGpa,
  };

  const applicationId = randomUUID();

  // Stub: backend teammate can replace this route with DB insert + registrar notification.
  console.info("[applications/student]", applicationId, payload.email, payload.priorGpa);

  const res = {
    ok: true as const,
    applicationId,
    message:
      "Your application was received. The Registrar will review it. If accepted, you will receive login credentials by email.",
  };
  return NextResponse.json(res);
}
