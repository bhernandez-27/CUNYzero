import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";

/*
 * Python must implement:
 *
 * GET {AUTH_PYTHON_BASE_URL}/registrar/complaints
 *   Success (200): ComplaintDTO[]
 *
 * PATCH {AUTH_PYTHON_BASE_URL}/registrar/complaints
 *   Body: { complaint_id, action, note? }
 *   Success (200): { status: "RESOLVED" | "DISMISSED"; message: string }
 *
 * Action values and spec rules (UC-10):
 *   - "warn_subject"       — issue 1 warning to the person being complained about
 *   - "dismiss"            — close the complaint with no action
 *   - "deregister_subject" — de-register the student being complained about (instructor→student only)
 *   - "warn_complainant"   — warn the instructor for filing an unfounded complaint (instructor→student only)
 *
 * Business rules Python enforces:
 *   - instructor→student complaints: Registrar MUST either warn/de-register the student
 *     OR warn the instructor. Cannot be dismissed without one of these actions.
 *   - All resolved complaints are logged with a timestamp.
 *   - System notifies all parties of the outcome.
 */

export type ComplaintDTO = {
  complaint_id: string;
  complainant_name: string;
  complainant_id: string;
  complainant_role: "student" | "instructor";
  subject_name: string;
  subject_id: string;
  subject_type: "student" | "instructor";
  description: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  filed_at: string;
};

export type ResolveComplaintRequest = {
  complaint_id: string;
  action: "warn_subject" | "dismiss" | "deregister_subject" | "warn_complainant";
  note?: string;
};

export async function GET(req: Request) {
  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json(getMockComplaints());
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/registrar/complaints`, { headers, signal: controller.signal });
    clearTimeout(t);
  } catch {
    console.warn("[registrar/complaints] Python unreachable, using mock data");
    return NextResponse.json(getMockComplaints());
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

  const { complaint_id, action, note } = (body as Record<string, unknown>) ?? {};

  if (!complaint_id || !action) {
    return NextResponse.json(
      { error: "missing_field", message: "complaint_id and action are required." },
      { status: 400 },
    );
  }

  const validActions = ["warn_subject", "dismiss", "deregister_subject", "warn_complainant"];
  if (!validActions.includes(String(action))) {
    return NextResponse.json(
      { error: "invalid_action", message: `action must be one of: ${validActions.join(", ")}.` },
      { status: 400 },
    );
  }

  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json({
      status: action === "dismiss" ? "DISMISSED" : "RESOLVED",
      message: "Complaint resolved successfully.",
    });
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/registrar/complaints`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ complaint_id, action, note: note ?? null }),
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

function getMockComplaints(): ComplaintDTO[] {
  return [
    {
      complaint_id: "CMP-001",
      complainant_name: "Alex Rivera",
      complainant_id: "STU-010",
      complainant_role: "student",
      subject_name: "Jordan Lee",
      subject_id: "STU-022",
      subject_type: "student",
      description:
        "Jordan repeatedly disrupts our study group sessions and has been spreading false rumors about my academic integrity.",
      status: "OPEN",
      filed_at: "2026-05-02T09:15:00Z",
    },
    {
      complaint_id: "CMP-002",
      complainant_name: "Priya Sharma",
      complainant_id: "STU-031",
      complainant_role: "student",
      subject_name: "Prof. Grant",
      subject_id: "INS-003",
      subject_type: "instructor",
      description:
        "Professor Grant has been consistently late to Friday classes by 20–30 minutes and has not covered the syllabus material properly.",
      status: "OPEN",
      filed_at: "2026-05-03T14:30:00Z",
    },
    {
      complaint_id: "CMP-003",
      complainant_name: "Prof. Lang",
      complainant_id: "INS-001",
      complainant_role: "instructor",
      subject_name: "Kevin Morris",
      subject_id: "STU-044",
      subject_type: "student",
      description:
        "Kevin submitted work that matches another student's submission word-for-word. Clear case of plagiarism.",
      status: "OPEN",
      filed_at: "2026-05-04T11:00:00Z",
    },
  ];
}
