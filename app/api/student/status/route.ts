import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import { getSession } from "@/lib/auth/session";

/*
 * Python must implement:
 *   GET {AUTH_PYTHON_BASE_URL}/student/status?student_id={id}
 *
 * Success (200): StudentStatusDTO
 * Unauthorized (401): { error: "UNAUTHORIZED" }
 *
 * standing values:
 *   ACTIVE                    — normal enrollment
 *   HONOR_ROLL                — semester GPA > 3.75 or overall GPA > 3.5 after > 1 semester
 *   WARNING_MANDATORY_INTERVIEW — GPA between 2.0 and 2.25; registrar interview required
 *   SUSPENDED                 — 3 warnings accumulated; suspended for 1 semester
 *   TERMINATED                — GPA < 2.0 or failed same course twice
 */

export type AcademicStanding =
  | "ACTIVE"
  | "HONOR_ROLL"
  | "WARNING_MANDATORY_INTERVIEW"
  | "SUSPENDED"
  | "TERMINATED";

export type StudentStatusDTO = {
  student_id: string;
  standing: AcademicStanding;
  gpa: number;
  warning_count: number;
  suspended: boolean;
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json(getMockStatus(session.id));
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(
      `${base}/student/status?student_id=${encodeURIComponent(session.id)}`,
      { headers, signal: controller.signal },
    );
    clearTimeout(t);
  } catch {
    console.warn("[student/status] Python unreachable, using mock data");
    return NextResponse.json(getMockStatus(session.id));
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

function getMockStatus(studentId: string): StudentStatusDTO {
  return {
    student_id: studentId,
    standing: "ACTIVE",
    gpa: 3.2,
    warning_count: 0,
    suspended: false,
  };
}
