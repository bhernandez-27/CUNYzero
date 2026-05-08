import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";

/*
 * Python must implement:
 *
 * GET {AUTH_PYTHON_BASE_URL}/registrar/classes
 *   Success (200): ClassSectionDTO[]
 *
 * POST {AUTH_PYTHON_BASE_URL}/registrar/classes
 *   Body: CreateClassRequest
 *   Success (201): ClassSectionDTO
 *   Validation (400): { error: string; message: string }
 *   Suspended instructor (422): { error: "INSTRUCTOR_SUSPENDED"; message: string }
 *
 * DELETE {AUTH_PYTHON_BASE_URL}/registrar/classes/{class_id}
 *   Success (200): { status: "DELETED"; message: string }
 *   Has enrollments (409): { error: "HAS_ENROLLMENTS"; message: string }
 *
 * Business rules Python enforces:
 *   - Classes may only be created/edited during the CLASS_SETUP period.
 *   - A suspended instructor cannot be assigned to a class.
 */

export type ClassSectionDTO = {
  class_id: string;
  course_name: string;
  course_code: string;
  section_id: string;
  instructor_name: string;
  instructor_id: string;
  capacity: number;
  enrolled: number;
  time_slots: Array<{ day: string; start: string; end: string }>;
  status: "ACTIVE" | "CANCELLED";
};

export type InstructorOptionDTO = {
  instructor_id: string;
  name: string;
  suspended: boolean;
};

export type ClassesPageDTO = {
  classes: ClassSectionDTO[];
  instructors: InstructorOptionDTO[];
};

export type CreateClassRequest = {
  course_name: string;
  course_code: string;
  instructor_id: string;
  capacity: number;
  time_slots: Array<{ day: string; start: string; end: string }>;
};

export async function GET(req: Request) {
  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json(getMockClassesPage());
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/registrar/classes`, { headers, signal: controller.signal });
    clearTimeout(t);
  } catch {
    console.warn("[registrar/classes] Python unreachable, using mock data");
    return NextResponse.json(getMockClassesPage());
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Request body must be JSON." }, { status: 400 });
  }

  const { course_name, course_code, instructor_id, capacity, time_slots } =
    (body as Record<string, unknown>) ?? {};

  if (!course_name || !course_code || !instructor_id || !capacity || !time_slots) {
    return NextResponse.json(
      { error: "missing_field", message: "course_name, course_code, instructor_id, capacity, and time_slots are required." },
      { status: 400 },
    );
  }

  const base = getAuthPythonBaseUrl();

  if (!base) {
    const mock: ClassSectionDTO = {
      class_id: `CLS-${Date.now()}`,
      course_name: String(course_name),
      course_code: String(course_code),
      section_id: `${String(course_code)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
      instructor_name: "TBD",
      instructor_id: String(instructor_id),
      capacity: Number(capacity),
      enrolled: 0,
      time_slots: time_slots as CreateClassRequest["time_slots"],
      status: "ACTIVE",
    };
    return NextResponse.json(mock, { status: 201 });
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/registrar/classes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ course_name, course_code, instructor_id, capacity, time_slots }),
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

function getMockClassesPage(): ClassesPageDTO {
  return {
    classes: [
      {
        class_id: "CLS-001",
        course_name: "Data Structures",
        course_code: "CSCI-201",
        section_id: "CSCI-201-A",
        instructor_name: "Prof. Lang",
        instructor_id: "INS-001",
        capacity: 30,
        enrolled: 14,
        time_slots: [
          { day: "Mon", start: "10:00", end: "11:30" },
          { day: "Wed", start: "10:00", end: "11:30" },
        ],
        status: "ACTIVE",
      },
      {
        class_id: "CLS-002",
        course_name: "Discrete Mathematics",
        course_code: "MATH-220",
        section_id: "MATH-220-B",
        instructor_name: "Prof. Patel",
        instructor_id: "INS-002",
        capacity: 25,
        enrolled: 20,
        time_slots: [
          { day: "Tue", start: "14:00", end: "15:30" },
          { day: "Thu", start: "14:00", end: "15:30" },
        ],
        status: "ACTIVE",
      },
      {
        class_id: "CLS-003",
        course_name: "Literature and Society",
        course_code: "ENGL-210",
        section_id: "ENGL-210-A",
        instructor_name: "Prof. Grant",
        instructor_id: "INS-003",
        capacity: 20,
        enrolled: 2,
        time_slots: [{ day: "Fri", start: "09:00", end: "12:00" }],
        status: "ACTIVE",
      },
    ],
    instructors: [
      { instructor_id: "INS-001", name: "Prof. Lang", suspended: false },
      { instructor_id: "INS-002", name: "Prof. Patel", suspended: false },
      { instructor_id: "INS-003", name: "Prof. Grant", suspended: false },
      { instructor_id: "INS-004", name: "Prof. Nguyen", suspended: false },
      { instructor_id: "INS-005", name: "Prof. Stein", suspended: true },
    ],
  };
}
