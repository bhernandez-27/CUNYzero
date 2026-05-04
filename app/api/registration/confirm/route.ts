import { NextResponse } from "next/server";
import { overlaps } from "@/components/dashboard/registration/utils";
import type {
  RegistrationConfirmError,
  RegistrationConfirmRequest,
  RegistrationConfirmResponse,
} from "@/lib/registration/apiTypes";
import { getMockRegistrationSections } from "@/lib/registration/mock";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RegistrationConfirmRequest;
    const selected = Array.isArray(body.selectedSectionIds) ? body.selectedSectionIds : [];
    const current = Array.isArray(body.currentSectionIds) ? body.currentSectionIds : [];

    const all = getMockRegistrationSections();
    const bySectionId = new Map(all.map((s) => [s.sectionId, s]));

    const errors: RegistrationConfirmError[] = [];

    const count = selected.length + current.length;
    if (count < 2 || count > 4) {
      errors.push({
        code: "COURSE_LOAD",
        message: "You must register for 2–4 courses.",
        min: 2,
        max: 4,
        count,
      });
    }

    const selectedSections = selected
      .map((id) => bySectionId.get(id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
    const currentSections = current
      .map((id) => bySectionId.get(id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    // Conflicts: any overlap between selected and current, OR among selected themselves.
    function recordConflict(sectionId: string, conflictsWith: string[]) {
      const unique = Array.from(new Set(conflictsWith)).filter((x) => x !== sectionId);
      if (!unique.length) return;
      errors.push({
        code: "SCHEDULE_CONFLICT",
        message: `${sectionId} conflicts with ${unique.join(", ")}.`,
        sectionId,
        conflictsWith: unique,
      });
    }

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

    for (const [sectionId, set] of conflictMap.entries()) recordConflict(sectionId, Array.from(set));

    if (errors.length) {
      const resp: RegistrationConfirmResponse = { status: "BLOCKED", enrolled: [], waitlisted: [], errors };
      return NextResponse.json(resp, { status: 200 });
    }

    const enrolled: string[] = [];
    const waitlisted: string[] = [];
    for (const s of selectedSections) {
      if (!s) continue;
      if (s.seatsAvailable > 0) enrolled.push(s.sectionId);
      else waitlisted.push(s.sectionId);
    }

    const resp: RegistrationConfirmResponse = { status: "OK", enrolled, waitlisted, errors: [] };
    return NextResponse.json(resp);
  } catch (error) {
    console.error("Error confirming registration:", error);
    return NextResponse.json({ error: "Failed to confirm registration" }, { status: 500 });
  }
}

