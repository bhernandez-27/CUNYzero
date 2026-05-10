import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import type { ClassRosterDTO } from "@/lib/instructor/types";

/*
 * Python must implement:
 *   GET {AUTH_PYTHON_BASE_URL}/instructor/roster/{classId}
 *
 * Success (200): ClassRosterDTO
 * Not found (404): { error: "CLASS_NOT_FOUND"; message: string }
 * Forbidden (403): { error: "FORBIDDEN"; message: string }
 */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ classId: string }> },
) {
  const { classId } = await params;
  const base = getAuthPythonBaseUrl();

  if (!base) {
    const mock = getMockRoster(classId);
    if (!mock) return NextResponse.json({ error: "CLASS_NOT_FOUND", message: "Class not found." }, { status: 404 });
    return NextResponse.json(mock);
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(
      `${base}/instructor/roster/${encodeURIComponent(classId)}`,
      { headers, signal: controller.signal },
    );
    clearTimeout(t);
  } catch {
    console.warn("[instructor/roster] Python unreachable, using mock data");
    const mock = getMockRoster(classId);
    if (!mock) return NextResponse.json({ error: "CLASS_NOT_FOUND", message: "Class not found." }, { status: 404 });
    return NextResponse.json(mock);
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

function getMockRoster(classId: string): ClassRosterDTO | null {
  const rosters: Record<string, ClassRosterDTO> = {
    "CLS-001": {
      class_id: "CLS-001",
      course_name: "Data Structures",
      course_code: "CSCI-201",
      section_id: "CSCI-201-A",
      semester: "Spring",
      year: 2025,
      time_slots: [
        { day: "Mon", start: "10:00", end: "11:30" },
        { day: "Wed", start: "10:00", end: "11:30" },
      ],
      students: [
        { enrollment_id: "ENR-001", student_id: "STU-101", student_name: "Alice Johnson", email: "alice@college.edu", grade: null, status: "ENROLLED" },
        { enrollment_id: "ENR-002", student_id: "STU-102", student_name: "Bob Martinez", email: "bob@college.edu", grade: null, status: "ENROLLED" },
        { enrollment_id: "ENR-003", student_id: "STU-103", student_name: "Carol White", email: "carol@college.edu", grade: null, status: "ENROLLED" },
        { enrollment_id: "ENR-004", student_id: "STU-104", student_name: "David Kim", email: "david@college.edu", grade: null, status: "ENROLLED" },
        { enrollment_id: "ENR-005", student_id: "STU-105", student_name: "Eva Chen", email: "eva@college.edu", grade: null, status: "ENROLLED" },
        { enrollment_id: "ENR-006", student_id: "STU-106", student_name: "Frank Lee", email: "frank@college.edu", grade: null, status: "ENROLLED" },
      ],
    },
    "CLS-002": {
      class_id: "CLS-002",
      course_name: "Discrete Mathematics",
      course_code: "MATH-220",
      section_id: "MATH-220-B",
      semester: "Spring",
      year: 2025,
      time_slots: [
        { day: "Tue", start: "14:00", end: "15:30" },
        { day: "Thu", start: "14:00", end: "15:30" },
      ],
      students: [
        { enrollment_id: "ENR-010", student_id: "STU-201", student_name: "Grace Park", email: "grace@college.edu", grade: null, status: "ENROLLED" },
        { enrollment_id: "ENR-011", student_id: "STU-202", student_name: "Henry Brown", email: "henry@college.edu", grade: null, status: "ENROLLED" },
        { enrollment_id: "ENR-012", student_id: "STU-203", student_name: "Iris Nguyen", email: "iris@college.edu", grade: null, status: "ENROLLED" },
        { enrollment_id: "ENR-013", student_id: "STU-204", student_name: "James Wilson", email: "james@college.edu", grade: null, status: "ENROLLED" },
        { enrollment_id: "ENR-014", student_id: "STU-205", student_name: "Karen Davis", email: "karen@college.edu", grade: null, status: "ENROLLED" },
      ],
    },
  };
  return rosters[classId] ?? null;
}
