import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import { getSession } from "@/lib/auth/session";
import type { StudentGradesDTO } from "@/lib/grades/types";

/*
 * Python must implement:
 *   GET {AUTH_PYTHON_BASE_URL}/grades/student?student_id={id}
 *
 * Success (200): StudentGradesDTO
 *   {
 *     student_id: string,
 *     cumulative_gpa: number | null,
 *     warning_count: number,
 *     honor_roll: boolean,
 *     courses_completed: number,
 *     semesters: [
 *       {
 *         semester: "Fall" | "Spring" | "Summer",
 *         year: number,
 *         semester_gpa: number | null,
 *         courses: [
 *           {
 *             course_code: string,
 *             course_name: string,
 *             section_id: string,
 *             instructor: string,
 *             credits: number,
 *             grade: "A"|"B"|"C"|"D"|"F"|"W"|"IP"|null,  // null = not yet posted
 *             grade_points: number | null                  // 4.0=A, 3.0=B, 2.0=C, 1.0=D, 0.0=F
 *           }
 *         ]
 *       }
 *     ]
 *   }
 */
export async function GET(req: Request) {
  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json(getMockGrades());
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
      `${base}/grades/student?student_id=${encodeURIComponent(studentId)}`,
      { headers, signal: controller.signal },
    );
    clearTimeout(t);
  } catch {
    console.warn("[grades/student] Python unreachable, using mock data");
    return NextResponse.json(getMockGrades());
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

function getMockGrades(): StudentGradesDTO {
  return {
    student_id: "dev-001",
    cumulative_gpa: 3.42,
    warning_count: 0,
    honor_roll: false,
    courses_completed: 6,
    semesters: [
      {
        semester: "Spring",
        year: 2025,
        semester_gpa: null,
        courses: [
          {
            course_code: "CSCI-201",
            course_name: "Data Structures",
            section_id: "CSCI-201-A",
            instructor: "Prof. Lang",
            credits: 4,
            grade: null,
            grade_points: null,
          },
          {
            course_code: "MATH-220",
            course_name: "Discrete Mathematics",
            section_id: "MATH-220-B",
            instructor: "Prof. Patel",
            credits: 4,
            grade: null,
            grade_points: null,
          },
          {
            course_code: "ENGL-210",
            course_name: "Literature and Society",
            section_id: "ENGL-210-A",
            instructor: "Prof. Grant",
            credits: 3,
            grade: null,
            grade_points: null,
          },
        ],
      },
      {
        semester: "Fall",
        year: 2024,
        semester_gpa: 3.58,
        courses: [
          {
            course_code: "CSCI-101",
            course_name: "Intro to Computer Science",
            section_id: "CSCI-101-A",
            instructor: "Prof. Nguyen",
            credits: 3,
            grade: "A",
            grade_points: 4.0,
          },
          {
            course_code: "MATH-120",
            course_name: "Calculus I",
            section_id: "MATH-120-A",
            instructor: "Prof. Stein",
            credits: 4,
            grade: "B",
            grade_points: 3.0,
          },
          {
            course_code: "HIST-101",
            course_name: "World Civilizations",
            section_id: "HIST-101-A",
            instructor: "Prof. Martinez",
            credits: 3,
            grade: "A",
            grade_points: 4.0,
          },
        ],
      },
    ],
  };
}
