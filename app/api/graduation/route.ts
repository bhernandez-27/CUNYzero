import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import { getSession } from "@/lib/auth/session";

/*
 * Python must implement:
 *
 * GET {AUTH_PYTHON_BASE_URL}/graduation/status?student_id={id}
 *   Success (200):
 *   {
 *     courses_completed: number,   // total passing courses (not F/W)
 *     courses_required: number,    // always 8
 *     eligible: boolean,           // courses_completed >= 8
 *     already_applied: boolean     // application already pending
 *   }
 *
 * POST {AUTH_PYTHON_BASE_URL}/graduation/apply
 *   Body: { student_id: string }
 *   Success (200):
 *   {
 *     status: "submitted",         // application accepted for Registrar review
 *     message: string
 *   }
 *   Warning (200):
 *   {
 *     status: "warning_issued",    // reckless application — < 8 courses, warning added
 *     message: string
 *   }
 */

export type GraduationStatusDTO = {
  courses_completed: number;
  courses_required: number;
  eligible: boolean;
  already_applied: boolean;
};

export type GraduationApplyResponse =
  | { status: "submitted"; message: string }
  | { status: "warning_issued"; message: string };

export async function GET(req: Request) {
  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json(getMockStatus());
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
      `${base}/graduation/status?student_id=${encodeURIComponent(studentId)}`,
      { headers, signal: controller.signal },
    );
    clearTimeout(t);
  } catch {
    console.warn("[graduation/status] Python unreachable, using mock data");
    return NextResponse.json(getMockStatus());
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

  const base = getAuthPythonBaseUrl();

  if (!base) {
    // Stub: simulate a successful submission in dev.
    return NextResponse.json(
      { status: "submitted", message: "Your graduation application has been submitted for Registrar review." },
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
    upstream = await fetch(`${base}/graduation/apply`, {
      method: "POST",
      headers,
      body: JSON.stringify({ student_id: studentId }),
      signal: controller.signal,
    });
    clearTimeout(t);
  } catch {
    return NextResponse.json(
      { error: "upstream_unreachable", message: "Could not reach the backend. Try again." },
      { status: 502 },
    );
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

function getMockStatus(): GraduationStatusDTO {
  return {
    courses_completed: 6,
    courses_required: 8,
    eligible: false,
    already_applied: false,
  };
}
