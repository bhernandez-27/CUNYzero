import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { InstructorApplicationPayload } from "@/lib/applications/types";

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
  const fieldOfExpertise = typeof b.fieldOfExpertise === "string" ? b.fieldOfExpertise.trim() : "";
  const credentialsSummary = typeof b.credentialsSummary === "string" ? b.credentialsSummary.trim() : "";

  if (!fullName || fullName.length > 200) {
    return NextResponse.json({ error: "validation_error", message: "Full name is required." }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "validation_error", message: "A valid email is required." }, { status: 400 });
  }
  if (!fieldOfExpertise || fieldOfExpertise.length > 200) {
    return NextResponse.json(
      { error: "validation_error", message: "Field of expertise / discipline is required." },
      { status: 400 },
    );
  }
  if (!credentialsSummary || credentialsSummary.length < 20) {
    return NextResponse.json(
      {
        error: "validation_error",
        message: "Please provide a short summary of your qualifications (at least 20 characters).",
      },
      { status: 400 },
    );
  }

  const payload: InstructorApplicationPayload = {
    fullName,
    email,
    phone: typeof b.phone === "string" ? b.phone.trim() || undefined : undefined,
    fieldOfExpertise,
    credentialsSummary,
  };

  const applicationId = randomUUID();

  console.info("[applications/instructor]", applicationId, payload.email);

  const res = {
    ok: true as const,
    applicationId,
    message:
      "Your instructor application was received. The Registrar will review it and notify you of the decision.",
  };
  return NextResponse.json(res);
}
