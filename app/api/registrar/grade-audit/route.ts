import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";

/*
 * Python must implement:
 *
 * GET {AUTH_PYTHON_BASE_URL}/registrar/grade-audit
 *   Success (200): ClassGradeAuditDTO[]
 *
 * PATCH {AUTH_PYTHON_BASE_URL}/registrar/grade-audit
 *   Body: { class_id, action, note? }
 *   Success (200): { status: "RESOLVED"; message: string }
 *
 * Flagging rules (from spec):
 *   - class_gpa > 3.5  → flagged as TOO_HIGH  (possible grade inflation)
 *   - class_gpa < 2.5  → flagged as TOO_LOW   (possible unfair grading)
 *   - Registrar must review and either warn or dismiss the instructor.
 *
 * Action values:
 *   - "request_justification" — notify the instructor to explain the GPA; flag stays open
 *   - "warn_instructor"       — issue 1 warning to the instructor; flag resolved
 *   - "dismiss_instructor"    — immediately dismiss/fire the instructor; flag resolved
 *   - "dismiss_flag"          — registrar reviewed and found no issue; flag cleared, no penalty
 */

export type ClassGradeAuditDTO = {
  class_id: string;
  course_name: string;
  section_id: string;
  instructor_name: string;
  instructor_id: string;
  class_gpa: number | null;
  student_count: number;
  flagged: boolean;
  flag_reason: "TOO_HIGH" | "TOO_LOW" | null;
  justification_requested: boolean;
  justification_text: string;
  resolved: boolean;
};

export async function GET(req: Request) {
  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json(getMockAudit());
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/registrar/grade-audit`, { headers, signal: controller.signal });
    clearTimeout(t);
  } catch {
    console.warn("[registrar/grade-audit] Python unreachable, using mock data");
    return NextResponse.json(getMockAudit());
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function PATCH(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Request body must be JSON." }, { status: 400 });
  }

  const { class_id, action, note } = (body as Record<string, unknown>) ?? {};

  if (!class_id || !action) {
    return NextResponse.json(
      { error: "missing_field", message: "class_id and action are required." },
      { status: 400 },
    );
  }

  const validActions = ["request_justification", "warn_instructor", "dismiss_instructor", "dismiss_flag"];
  if (!validActions.includes(String(action))) {
    return NextResponse.json(
      { error: "invalid_action", message: `action must be one of: ${validActions.join(", ")}.` },
      { status: 400 },
    );
  }

  const base = getAuthPythonBaseUrl();

  if (!base) {
    const isResolved = action !== "request_justification";
    return NextResponse.json({
      status: isResolved ? "RESOLVED" : "JUSTIFICATION_REQUESTED",
      message: isResolved ? "Flag resolved successfully." : "Instructor has been notified to provide justification.",
    });
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/registrar/grade-audit`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ class_id, action, note: note ?? null }),
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

function getMockAudit(): ClassGradeAuditDTO[] {
  return [
    {
      class_id: "CLS-001",
      course_name: "Data Structures",
      section_id: "CSCI-201-A",
      instructor_name: "Prof. Lang",
      instructor_id: "INS-001",
      class_gpa: 3.8,
      student_count: 14,
      flagged: true,
      flag_reason: "TOO_HIGH",
      justification_requested: false,
      resolved: false,
    },
    {
      class_id: "CLS-002",
      course_name: "Discrete Mathematics",
      section_id: "MATH-220-B",
      instructor_name: "Prof. Patel",
      instructor_id: "INS-002",
      class_gpa: 3.1,
      student_count: 20,
      flagged: false,
      flag_reason: null,
      justification_requested: false,
      resolved: false,
    },
    {
      class_id: "CLS-003",
      course_name: "Literature and Society",
      section_id: "ENGL-210-A",
      instructor_name: "Prof. Grant",
      instructor_id: "INS-003",
      class_gpa: 2.1,
      student_count: 18,
      flagged: true,
      flag_reason: "TOO_LOW",
      justification_requested: false,
      resolved: false,
    },
    {
      class_id: "CLS-004",
      course_name: "World Civilizations",
      section_id: "HIST-101-A",
      instructor_name: "Prof. Martinez",
      instructor_id: "INS-006",
      class_gpa: 2.9,
      student_count: 22,
      flagged: false,
      flag_reason: null,
      justification_requested: false,
      resolved: false,
    },
  ];
}
