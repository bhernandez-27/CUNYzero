import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import { getSession } from "@/lib/auth/session";

/*
 * Python must implement:
 *   POST {AUTH_PYTHON_BASE_URL}/complaints
 *
 * Request body:
 *   {
 *     complainant_id:   string,
 *     complainant_role: "student" | "instructor",
 *     subject_type:     "student" | "instructor",  // who is being complained about
 *     subject_id:       string,                    // ID or name of the subject
 *     description:      string
 *   }
 *
 * Success (201):
 *   { complaint_id: string, status: "submitted" }
 *
 * Validation error (400):
 *   { error: string, message: string }
 *
 * Business rules Python enforces:
 *   - Instructors may only file complaints against students (subject_type must be "student").
 *   - Students may file against students or instructors.
 *   - Complaint lands in the Registrar queue for review.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Request body must be JSON." }, { status: 400 });
  }

  const { subject_type, subject_id, description } = body as Record<string, unknown>;

  if (!subject_type || !subject_id || !description) {
    return NextResponse.json(
      { error: "validation_error", message: "subject_type, subject_id, and description are required." },
      { status: 400 },
    );
  }

  if (typeof description === "string" && description.trim().length < 10) {
    return NextResponse.json(
      { error: "validation_error", message: "Description must be at least 10 characters." },
      { status: 400 },
    );
  }

  const session = await getSession();
  const complainantId = session?.id ?? "dev-001";
  const complainantRole = session?.role ?? "student";

  // Instructors can only complain about students.
  if (complainantRole === "instructor" && subject_type !== "student") {
    return NextResponse.json(
      { error: "not_allowed", message: "Instructors may only file complaints against students." },
      { status: 403 },
    );
  }

  const base = getAuthPythonBaseUrl();

  if (!base) {
    // No backend — return a stub success so the UI works in dev.
    return NextResponse.json(
      { complaint_id: `CMP-${Date.now()}`, status: "submitted" },
      { status: 201 },
    );
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/complaints`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        complainant_id: complainantId,
        complainant_role: complainantRole,
        subject_type,
        subject_id: String(subject_id).trim(),
        description: String(description).trim(),
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
  } catch {
    return NextResponse.json(
      { error: "upstream_unreachable", message: "Could not reach the backend. Try again." },
      { status: 502 },
    );
  }

  const responseBody = await upstream.text();
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
