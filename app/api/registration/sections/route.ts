import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import { getSession } from "@/lib/auth/session";
import { getMockRegistrationSections } from "@/lib/registration/mock";

/*
 * Python must implement:
 *   GET {AUTH_PYTHON_BASE_URL}/registration/sections?student_id={id}
 *
 * Success (200): RegistrationSectionDTO[]
 *   Each section object shape:
 *   {
 *     id: string,
 *     sectionId: string,
 *     courseName: string,
 *     department: string,
 *     credits: number,
 *     instructor: string,
 *     timeSlots: [{ day: "Mon"|"Tue"|"Wed"|"Thu"|"Fri", start: "HH:MM", end: "HH:MM" }],
 *     seatsAvailable: number,
 *     initialStatus: null | "ENROLLED" | "WAITLISTED",
 *     previousGrade: null | "A" | "B" | "C" | "D" | "F"
 *   }
 *
 * Period closed (403):
 *   { error: "PERIOD_CLOSED", message: "..." }
 */
export async function GET(req: Request) {
  const base = getAuthPythonBaseUrl();

  if (!base) {
    // No backend configured — return mock data so the UI works during development.
    return NextResponse.json(getMockRegistrationSections());
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
      `${base}/registration/sections?student_id=${encodeURIComponent(studentId)}`,
      { headers, signal: controller.signal },
    );
    clearTimeout(t);
  } catch {
    // Python unreachable — fall back to mock so the page doesn't break.
    console.warn("[registration/sections] Python unreachable, using mock data");
    return NextResponse.json(getMockRegistrationSections());
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
