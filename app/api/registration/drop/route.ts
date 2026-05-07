import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import { getSession } from "@/lib/auth/session";

/*
 * Python must implement:
 *
 * GET {AUTH_PYTHON_BASE_URL}/registration/enrollments?student_id={id}
 *   Success (200): EnrolledCourseDTO[]
 *   [
 *     {
 *       enrollment_id: string,
 *       course_name: string,
 *       section_id: string,
 *       instructor: string,
 *       credits: number,
 *       time_slots: [{ day: string; start: string; end: string }],
 *       status: "ENROLLED" | "WAITLISTED",
 *       can_drop: boolean,
 *       drop_blocked_reason: string | null   // e.g. "Drop period closed" or "Below minimum load"
 *     }
 *   ]
 *
 * POST {AUTH_PYTHON_BASE_URL}/registration/drop
 *   Body: { student_id: string, enrollment_id: string }
 *   Success (200):    { status: "DROPPED"; message: string }
 *   Period closed (403): { error: "PERIOD_CLOSED"; message: string }
 *   Min load (422):  { error: "MIN_LOAD"; message: string }
 */

export type EnrolledCourseDTO = {
  enrollment_id: string;
  course_name: string;
  section_id: string;
  instructor: string;
  credits: number;
  time_slots: Array<{ day: string; start: string; end: string }>;
  status: "ENROLLED" | "WAITLISTED";
  can_drop: boolean;
  drop_blocked_reason: string | null;
};

export type DropResponse =
  | { status: "DROPPED"; message: string }
  | { error: string; message: string };

export async function GET(req: Request) {
  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json(getMockEnrollments());
  }

  const session = await getSession();
  const studentId = session?.id ?? "";

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(
      `${base}/registration/enrollments?student_id=${encodeURIComponent(studentId)}`,
      { headers, signal: controller.signal },
    );
    clearTimeout(t);
  } catch {
    console.warn("[registration/enrollments] Python unreachable, using mock data");
    return NextResponse.json(getMockEnrollments());
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  const studentId = session?.id ?? "dev-001";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Invalid request body." }, { status: 400 });
  }

  const { enrollment_id } = (body as Record<string, unknown>) ?? {};
  if (typeof enrollment_id !== "string" || !enrollment_id.trim()) {
    return NextResponse.json(
      { error: "missing_field", message: "enrollment_id is required." },
      { status: 400 },
    );
  }

  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json(
      { status: "DROPPED", message: "Course dropped successfully." },
      { status: 200 },
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
    upstream = await fetch(`${base}/registration/drop`, {
      method: "POST",
      headers,
      body: JSON.stringify({ student_id: studentId, enrollment_id: enrollment_id.trim() }),
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

function getMockEnrollments(): EnrolledCourseDTO[] {
  return [
    {
      enrollment_id: "ENR-001",
      course_name: "Data Structures",
      section_id: "CSCI-201-A",
      instructor: "Prof. Lang",
      credits: 4,
      time_slots: [
        { day: "Mon", start: "10:00", end: "11:30" },
        { day: "Wed", start: "10:00", end: "11:30" },
      ],
      status: "ENROLLED",
      can_drop: true,
      drop_blocked_reason: null,
    },
    {
      enrollment_id: "ENR-002",
      course_name: "Discrete Mathematics",
      section_id: "MATH-220-B",
      instructor: "Prof. Patel",
      credits: 4,
      time_slots: [
        { day: "Tue", start: "14:00", end: "15:30" },
        { day: "Thu", start: "14:00", end: "15:30" },
      ],
      status: "ENROLLED",
      can_drop: true,
      drop_blocked_reason: null,
    },
    {
      enrollment_id: "ENR-003",
      course_name: "Literature and Society",
      section_id: "ENGL-210-A",
      instructor: "Prof. Grant",
      credits: 3,
      time_slots: [{ day: "Fri", start: "09:00", end: "12:00" }],
      status: "ENROLLED",
      can_drop: false,
      drop_blocked_reason: "Dropping this course would leave you below the 2-course minimum.",
    },
  ];
}
