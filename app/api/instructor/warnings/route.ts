import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import { getSession } from "@/lib/auth/session";

/*
 * Python must implement:
 *   POST {AUTH_PYTHON_BASE_URL}/instructor/warnings
 *   Body: { student_id: string, class_id: string, reason: string }
 *
 * Success (200): { status: "OK"; message: string }
 * Forbidden (403): { error: "FORBIDDEN"; message: string }
 *   — returned when the student is not enrolled in one of the instructor's classes
 * Not found (404): { error: "STUDENT_NOT_FOUND"; message: string }
 */

type IssueWarningBody = {
  student_id: string;
  class_id: string;
  reason: string;
};

// Mirrors the mock roster data in app/api/instructor/roster/[classId]/route.ts
const MOCK_ROSTERS: Record<string, string[]> = {
  "CLS-001": ["STU-101", "STU-102", "STU-103", "STU-104", "STU-105", "STU-106"],
  "CLS-002": ["STU-201", "STU-202", "STU-203", "STU-204", "STU-205"],
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Not authenticated." }, { status: 401 });
  }
  if (session.role !== "instructor") {
    return NextResponse.json({ error: "FORBIDDEN", message: "Only instructors can issue warnings." }, { status: 403 });
  }

  let body: Partial<IssueWarningBody>;
  try {
    body = (await req.json()) as Partial<IssueWarningBody>;
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body." }, { status: 400 });
  }

  const { student_id, class_id, reason } = body;
  if (!student_id || !class_id || !reason?.trim()) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "student_id, class_id, and reason are required." },
      { status: 400 },
    );
  }

  const base = getAuthPythonBaseUrl();

  if (!base) {
    // Authorization check: verify the student is in this class's mock roster
    const rosterStudents = MOCK_ROSTERS[class_id];
    if (!rosterStudents) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Class not found or not assigned to you." }, { status: 403 });
    }
    if (!rosterStudents.includes(student_id)) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "You can only warn students enrolled in your classes." },
        { status: 403 },
      );
    }
    return NextResponse.json({ status: "OK", message: "Warning issued successfully." });
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
    upstream = await fetch(`${base}/instructor/warnings`, {
      method: "POST",
      headers,
      body: JSON.stringify({ student_id, class_id, reason }),
      signal: controller.signal,
    });
    clearTimeout(t);
  } catch {
    console.warn("[instructor/warnings] Python unreachable");
    return NextResponse.json(
      { error: "SERVICE_UNAVAILABLE", message: "Could not reach the backend service." },
      { status: 502 },
    );
  }

  const responseBody = await upstream.text();
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
