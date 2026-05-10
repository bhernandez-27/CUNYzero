import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import type { WaitlistStudentDTO } from "@/lib/instructor/types";

/*
 * Python must implement:
 *   GET  {AUTH_PYTHON_BASE_URL}/instructor/waitlist/{classId}
 *        Success (200): WaitlistStudentDTO[]
 *
 *   PATCH {AUTH_PYTHON_BASE_URL}/instructor/waitlist/{classId}
 *        Body: { waitlist_id: string; action: "approve" | "deny" }
 *        Success (200): { status: "APPROVED" | "DENIED"; message: string }
 *        Full (409):    { error: "CLASS_FULL"; message: string }
 *        Forbidden (403): { error: "FORBIDDEN"; message: string }
 */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ classId: string }> },
) {
  const { classId } = await params;
  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json(getMockWaitlist(classId));
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(
      `${base}/instructor/waitlist/${encodeURIComponent(classId)}`,
      { headers, signal: controller.signal },
    );
    clearTimeout(t);
  } catch {
    console.warn("[instructor/waitlist] Python unreachable, using mock data");
    return NextResponse.json(getMockWaitlist(classId));
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ classId: string }> },
) {
  const { classId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Request body must be JSON." }, { status: 400 });
  }

  const { waitlist_id, action } = (body as Record<string, unknown>) ?? {};

  if (!waitlist_id || (action !== "approve" && action !== "deny")) {
    return NextResponse.json(
      { error: "missing_field", message: "waitlist_id and action ('approve' | 'deny') are required." },
      { status: 400 },
    );
  }

  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json({
      status: action === "approve" ? "APPROVED" : "DENIED",
      message: action === "approve"
        ? "Student enrolled successfully. (dev mode)"
        : "Student removed from waitlist. (dev mode)",
    });
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/instructor/waitlist/${encodeURIComponent(classId)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ waitlist_id, action }),
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

function getMockWaitlist(classId: string): WaitlistStudentDTO[] {
  if (classId !== "CLS-002") return [];
  return [
    {
      waitlist_id: "WL-001",
      student_id: "STU-301",
      student_name: "Laura Gomez",
      email: "laura@college.edu",
      joined_at: "2025-01-15T09:30:00Z",
      class_id: "CLS-002",
      course_name: "Discrete Mathematics",
      section_id: "MATH-220-B",
    },
    {
      waitlist_id: "WL-002",
      student_id: "STU-302",
      student_name: "Marcus Thompson",
      email: "marcus@college.edu",
      joined_at: "2025-01-15T11:00:00Z",
      class_id: "CLS-002",
      course_name: "Discrete Mathematics",
      section_id: "MATH-220-B",
    },
    {
      waitlist_id: "WL-003",
      student_id: "STU-303",
      student_name: "Nina Patel",
      email: "nina@college.edu",
      joined_at: "2025-01-16T08:45:00Z",
      class_id: "CLS-002",
      course_name: "Discrete Mathematics",
      section_id: "MATH-220-B",
    },
  ];
}
