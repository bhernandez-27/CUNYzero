import type { SectionRow, TimeSlot } from "./types";

export function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => Number(x));
  return h * 60 + m;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function fromMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

export function overlaps(a: TimeSlot, b: TimeSlot): boolean {
  if (a.day !== b.day) return false;
  const a0 = toMinutes(a.start);
  const a1 = toMinutes(a.end);
  const b0 = toMinutes(b.start);
  const b1 = toMinutes(b.end);
  return a0 < b1 && a1 > b0;
}

export function fmtSlots(slots: TimeSlot[]): string {
  return slots.map((s) => `${s.day} ${s.start}-${s.end}`).join(", ");
}

export function hasScheduleConflict(target: SectionRow, against: SectionRow[]): boolean {
  return against.some((c) => c.timeSlots.some((a) => target.timeSlots.some((b) => overlaps(a, b))));
}

