import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import { getSession } from "@/lib/auth/session";
import { overlaps } from "@/components/dashboard/registration/utils";
import type {
  RegistrationConfirmError,
  RegistrationConfirmRequest,
  RegistrationConfirmResponse,
} from "@/lib/registration/apiTypes";
import { getMockRegistrationSections } from "@/lib/registration/mock";

/*
 * Python must implement:
 *   POST {AUTH_PYTHON_BASE_URL}/registration/confirm
 *
 * Request body:
 *   {
 *     student_id: string,
 *     selected_section_ids: string[],
 *     current_section_ids: string[]
 *   }
 *
 * Success (200) — enrolled:
 *   { status: "OK", enrolled: string[], waitlisted: string[], errors: [] }
 *
 * Success (200) — blocked:
 *   { status: "BLOCKED", enrolled: [], waitlisted: [], errors: RegistrationConfirmError[] }
 *   Error codes: SCHEDULE_CONFLICT | COURSE_LOAD | RETAKE_NOT_ALLOWED | PERIOD_CLOSED | SECTION_NOT_FOUND
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Accept both camelCase (internal Next.js calls) and snake_case (direct Python-style calls).
  const b = body as Record<string, unknown>;
  const selected: string[] = Array.isArray(b.selected_section_ids)
    ? (b.selected_section_ids as string[])
    : Array.isArray(b.selectedSectionIds)
      ? (b.selectedSectionIds as string[])
      : [];
  const current: string[] = Array.isArray(b.current_section_ids)
    ? (b.current_section_ids as string[])
    : Array.isArray(b.currentSectionIds)
      ? (b.currentSectionIds as string[])
      : [];

  const base = getAuthPythonBaseUrl();

  if (base) {
    // --- Proxy to Python ---
    const session = await getSession();
    const studentId = session?.id ?? "";

    const cookie = req.headers.get("cookie");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (cookie) headers.Cookie = cookie;

    const payload: RegistrationConfirmRequest = {
      student_id: studentId,
      selected_section_ids: selected,
      current_section_ids: current,
    };

    let upstream: Response;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 10_000);
      upstream = await fetch(`${base}/registration/confirm`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(t);
    } catch {
      // Python unreachable — fall through to local validation below.
      console.warn("[registration/confirm] Python unreachable, running local validation");
      return localValidation(selected, current);
    }

    const upstreamBody = await upstream.text();
    return new NextResponse(upstreamBody, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  }

  // --- No backend configured: local validation against mock data ---
  return localValidation(selected, current);
}

function localValidation(selected: string[], current: string[]): NextResponse {
  const all = getMockRegistrationSections();
  const bySectionId = new Map(all.map((s) => [s.sectionId, s]));
  const errors: RegistrationConfirmError[] = [];

  const count = selected.length + current.length;
  if (count < 2 || count > 4) {
    errors.push({ code: "COURSE_LOAD", message: "You must register for 2–4 courses.", min: 2, max: 4, count });
  }

  const selectedSections = selected.map((id) => bySectionId.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof bySectionId.get>>[];
  const currentSections = current.map((id) => bySectionId.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof bySectionId.get>>[];

  const conflictMap = new Map<string, Set<string>>();
  function addPair(a: string, b: string) {
    if (!conflictMap.has(a)) conflictMap.set(a, new Set());
    if (!conflictMap.has(b)) conflictMap.set(b, new Set());
    conflictMap.get(a)!.add(b);
    conflictMap.get(b)!.add(a);
  }

  for (const a of selectedSections) {
    for (const b of currentSections) {
      if (a.sectionId === b.sectionId) continue;
      if (a.timeSlots.some((x) => b.timeSlots.some((y) => overlaps(x, y)))) addPair(a.sectionId, b.sectionId);
    }
  }
  for (let i = 0; i < selectedSections.length; i++) {
    for (let j = i + 1; j < selectedSections.length; j++) {
      const a = selectedSections[i]!;
      const b = selectedSections[j]!;
      if (a.sectionId === b.sectionId) continue;
      if (a.timeSlots.some((x) => b.timeSlots.some((y) => overlaps(x, y)))) addPair(a.sectionId, b.sectionId);
    }
  }

  for (const [sectionId, set] of conflictMap.entries()) {
    const conflictsWith = Array.from(set).filter((x) => x !== sectionId);
    if (conflictsWith.length) {
      errors.push({ code: "SCHEDULE_CONFLICT", message: `${sectionId} conflicts with ${conflictsWith.join(", ")}.`, sectionId, conflictsWith });
    }
  }

  if (errors.length) {
    const resp: RegistrationConfirmResponse = { status: "BLOCKED", enrolled: [], waitlisted: [], errors };
    return NextResponse.json(resp);
  }

  const enrolled: string[] = [];
  const waitlisted: string[] = [];
  for (const s of selectedSections) {
    if (s.seatsAvailable > 0) enrolled.push(s.sectionId);
    else waitlisted.push(s.sectionId);
  }

  return NextResponse.json({ status: "OK", enrolled, waitlisted, errors: [] } satisfies RegistrationConfirmResponse);
}
