import { NextResponse } from "next/server";
import { proxyJsonToPython } from "@/lib/auth/proxyUpstream";

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
      {
        error: "validation_error",
        message: "Fields email, password, and name are required strings.",
      },
      { status: 400 },
    );
  }

  const roleStr = typeof role === "string" ? role : "student";
  if (!ROLES.has(roleStr)) {
    return NextResponse.json(
      { error: "validation_error", message: "role must be \"student\" or \"instructor\"." },
      { status: 400 },
    );
  }

  const payload = {
    email: email.trim(),
    password,
    name: name.trim(),
    role: roleStr as "student" | "instructor",
  };

  return proxyJsonToPython("/auth/register", payload, req);
}
