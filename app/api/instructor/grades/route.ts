import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import type { GradeSubmissionRequest, GradeSubmissionResult } from "@/lib/instructor/types";

/*
 * Python must implement:
 *   POST {AUTH_PYTHON_BASE_URL}/instructor/grades
 *
 * Body: GradeSubmissionRequest { class_id, grades: [{ enrollment_id, grade }] }
 * Success (200): GradeSubmissionResult { status: "OK", graded_count, message }
 * Validation (400): { error: string; message: string }
 * Period error (403): { error: "WRONG_PERIOD"; message: string }
 *
 * Business rules Python enforces:
 *   - Grades can only be submitted during the GRADING period.
 *   - Only the assigned instructor may grade their own class.
 *   - Posting a grade that triggers student termination/suspension/honor roll
 *     is handled automatically by the backend.
 */

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Request body must be JSON." }, { status: 400 });
  }

  const { class_id, grades } = (body as Record<string, unknown>) ?? {};

  if (!class_id || !Array.isArray(grades) || grades.length === 0) {
    return NextResponse.json(
      { error: "missing_field", message: "class_id and a non-empty grades array are required." },
      { status: 400 },
    );
  }

  const base = getAuthPythonBaseUrl();

  if (!base) {
    const result: GradeSubmissionResult = {
      status: "OK",
      graded_count: (grades as GradeSubmissionRequest["grades"]).length,
      message: `Grades submitted for ${(grades as GradeSubmissionRequest["grades"]).length} student(s). (dev mode)`,
    };
    return NextResponse.json(result);
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/instructor/grades`, {
      method: "POST",
      headers,
      body: JSON.stringify({ class_id, grades }),
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
