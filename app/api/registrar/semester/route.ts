import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";

/*
 * Python must implement:
 *
 * GET {AUTH_PYTHON_BASE_URL}/registrar/semester
 *   Success (200): SemesterDTO
 *
 * POST {AUTH_PYTHON_BASE_URL}/registrar/semester/advance
 *   Success (200): SemesterDTO   (the new period after advancing)
 *   Conflict (409): { error: string; message: string }
 *
 * On transition to CLASS_RUNNING Python must:
 *   - Cancel sections with < 3 enrolled students
 *   - Notify affected students + instructors
 *   - Grant cancelled-course students a one-time re-registration window
 *   - Warn students still enrolled in < 2 courses after re-registration
 *   - Suspend instructors whose ALL courses were cancelled
 *
 * On transition to GRADING Python must:
 *   - Lock all course registration
 */

export type SemesterPeriod = "CLASS_SETUP" | "REGISTRATION" | "CLASS_RUNNING" | "GRADING";

export type CancelledClassInfo = {
  class_id: number;
  course_name: string;
  enrolled: number;
};

export type SemesterDTO = {
  period: SemesterPeriod;
  semester: "Fall" | "Spring";
  year: number;
  advanced_at: string;
  cancelled_classes?: CancelledClassInfo[];
  warnings_issued?: number;
  instructors_suspended?: number;
};

export const PERIOD_LABELS: Record<SemesterPeriod, string> = {
  CLASS_SETUP: "Class Set-Up",
  REGISTRATION: "Course Registration",
  CLASS_RUNNING: "Class Running",
  GRADING: "Grading",
};

export const PERIOD_DESCRIPTIONS: Record<SemesterPeriod, string> = {
  CLASS_SETUP:
    "Define courses, assign instructors, set meeting times and enrollment capacities. Students cannot register yet.",
  REGISTRATION:
    "Students register for 2–4 courses. The system enforces time conflict checks and enrollment caps. Waitlists are active.",
  CLASS_RUNNING:
    "Registration is locked. Sections with fewer than 3 students are automatically cancelled. Course reviews and AI Q&A are active.",
  GRADING:
    "Instructors submit final grades. GPAs are recalculated. Honor roll, warnings, suspensions, and terminations are applied automatically.",
};

export const PERIOD_ORDER: SemesterPeriod[] = [
  "CLASS_SETUP",
  "REGISTRATION",
  "CLASS_RUNNING",
  "GRADING",
];

export async function GET(req: Request) {
  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json(getMockSemester());
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/registrar/semester`, { headers, signal: controller.signal });
    clearTimeout(t);
  } catch {
    console.warn("[registrar/semester] Python unreachable, using mock data");
    return NextResponse.json(getMockSemester());
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function POST(req: Request) {
  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json({
      period: "REGISTRATION" as SemesterPeriod,
      semester: "Fall",
      year: 2026,
      advanced_at: new Date().toISOString(),
    } satisfies SemesterDTO);
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/registrar/semester/advance`, {
      method: "POST",
      headers,
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

function getMockSemester(): SemesterDTO {
  return {
    period: "CLASS_SETUP",
    semester: "Fall",
    year: 2026,
    advanced_at: "2026-05-01T08:00:00Z",
  };
}
