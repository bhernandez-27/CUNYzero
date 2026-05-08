import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";

/*
 * Python must implement:
 *
 * GET {AUTH_PYTHON_BASE_URL}/registrar/graduation
 *   Success (200): GraduationApplicationDTO[]
 *
 * PATCH {AUTH_PYTHON_BASE_URL}/registrar/graduation
 *   Body: { application_id, decision, note? }
 *   Success (200): { status: "APPROVED" | "REJECTED"; message: string }
 *
 * Business rules Python enforces (UC-11):
 *   - APPROVED: student has completed all 8 required courses →
 *     degree is awarded and student account is removed from the active system.
 *   - REJECTED when eligible: registrar chose not to approve (e.g. missing specific
 *     course requirements not reflected in the count).
 *   - REJECTED when not eligible: student applied recklessly →
 *     1 warning is added to their record; they remain enrolled.
 */

export type GraduationApplicationDTO = {
  application_id: string;
  student_id: string;
  student_name: string;
  email: string;
  cumulative_gpa: number | null;
  courses_completed: number;
  courses_required: number;
  eligible: boolean;
  applied_at: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export async function GET(req: Request) {
  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json(getMockApplications());
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/registrar/graduation`, { headers, signal: controller.signal });
    clearTimeout(t);
  } catch {
    console.warn("[registrar/graduation] Python unreachable, using mock data");
    return NextResponse.json(getMockApplications());
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

  const { application_id, decision, note } = (body as Record<string, unknown>) ?? {};

  if (!application_id || !decision) {
    return NextResponse.json(
      { error: "missing_field", message: "application_id and decision are required." },
      { status: 400 },
    );
  }
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return NextResponse.json(
      { error: "invalid_decision", message: "decision must be APPROVED or REJECTED." },
      { status: 400 },
    );
  }

  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json({
      status: decision,
      message:
        decision === "APPROVED"
          ? "Graduation approved. Student account will be removed from the active system."
          : "Application rejected. Student has been notified.",
    });
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/registrar/graduation`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ application_id, decision, note: note ?? null }),
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

function getMockApplications(): GraduationApplicationDTO[] {
  return [
    {
      application_id: "GRAD-001",
      student_id: "STU-012",
      student_name: "Carlos Mendez",
      email: "c.mendez@college0.edu",
      cumulative_gpa: 3.61,
      courses_completed: 8,
      courses_required: 8,
      eligible: true,
      applied_at: "2026-05-05T10:00:00Z",
      status: "PENDING",
    },
    {
      application_id: "GRAD-002",
      student_id: "STU-034",
      student_name: "Nina Okafor",
      email: "n.okafor@college0.edu",
      cumulative_gpa: 3.88,
      courses_completed: 8,
      courses_required: 8,
      eligible: true,
      applied_at: "2026-05-06T14:30:00Z",
      status: "PENDING",
    },
    {
      application_id: "GRAD-003",
      student_id: "STU-057",
      student_name: "Derek Walsh",
      email: "d.walsh@college0.edu",
      cumulative_gpa: 2.31,
      courses_completed: 5,
      courses_required: 8,
      eligible: false,
      applied_at: "2026-05-07T09:15:00Z",
      status: "PENDING",
    },
  ];
}
