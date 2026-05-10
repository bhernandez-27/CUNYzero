import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import { getSession } from "@/lib/auth/session";
import type { InstructorClassDTO } from "@/lib/instructor/types";

/*
 * Python must implement:
 *   GET {AUTH_PYTHON_BASE_URL}/instructor/classes?instructor_id={id}
 *
 * Success (200): InstructorClassDTO[]
 */

export async function GET(req: Request) {
  const base = getAuthPythonBaseUrl();
  const session = await getSession();
  const instructorId = session?.id ?? "dev-ins-001";

  if (!base) {
    return NextResponse.json(getMockClasses(instructorId));
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(
      `${base}/instructor/classes?instructor_id=${encodeURIComponent(instructorId)}`,
      { headers, signal: controller.signal },
    );
    clearTimeout(t);
  } catch {
    console.warn("[instructor/classes] Python unreachable, using mock data");
    return NextResponse.json(getMockClasses(instructorId));
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

function getMockClasses(_instructorId: string): InstructorClassDTO[] {
  return [
    {
      class_id: "CLS-001",
      course_name: "Data Structures",
      course_code: "CSCI-201",
      section_id: "CSCI-201-A",
      semester: "Spring",
      year: 2025,
      capacity: 30,
      enrolled: 14,
      waitlisted: 0,
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
      semester: "Spring",
      year: 2025,
      capacity: 25,
      enrolled: 25,
      waitlisted: 3,
      time_slots: [
        { day: "Tue", start: "14:00", end: "15:30" },
        { day: "Thu", start: "14:00", end: "15:30" },
      ],
      status: "ACTIVE",
    },
  ];
}
