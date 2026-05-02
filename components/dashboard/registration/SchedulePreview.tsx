"use client";

import { useMemo } from "react";
import type { RowStatus, SectionRow, TimeSlot } from "./types";
import { fromMinutes, toMinutes } from "./utils";

type Day = TimeSlot["day"];
const DAYS: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];

type CalendarEvent = {
  key: string;
  day: Day;
  startMin: number;
  endMin: number;
  title: string;
  subtitle: string;
  status: RowStatus;
  conflict: boolean;
};

export default function SchedulePreview(props: { rows: SectionRow[] }) {
  const events = useMemo<CalendarEvent[]>(() => {
    const active = props.rows.filter((r) => r.status !== "NOT_ENROLLED");
    const out: CalendarEvent[] = [];
    for (const r of active) {
      for (const slot of r.timeSlots) {
        out.push({
          key: `${r.sectionId}_${slot.day}_${slot.start}_${slot.end}`,
          day: slot.day,
          startMin: toMinutes(slot.start),
          endMin: toMinutes(slot.end),
          title: r.sectionId,
          subtitle: r.courseName,
          status: r.status,
          conflict: false,
        });
      }
    }
    // mark conflicts (overlapping events on same day)
    const byDay: Record<Day, CalendarEvent[]> = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] };
    for (const e of out) byDay[e.day].push(e);
    for (const d of DAYS) {
      const list = byDay[d].sort((a, b) => a.startMin - b.startMin);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          if (list[j].startMin >= list[i].endMin) break;
          list[i].conflict = true;
          list[j].conflict = true;
        }
      }
    }
    return out;
  }, [props.rows]);

  const minTime = 8 * 60;
  const maxTime = 18 * 60;
  const hours = Array.from({ length: (maxTime - minTime) / 60 + 1 }).map((_, i) => minTime + i * 60);

  const dayEvents = useMemo(() => {
    const by: Record<Day, CalendarEvent[]> = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] };
    for (const e of events) by[e.day].push(e);
    for (const d of DAYS) by[d].sort((a, b) => a.startMin - b.startMin);
    return by;
  }, [events]);

  function eventTone(status: RowStatus, conflict: boolean) {
    if (conflict) return "bg-red-50 border-red-200 text-red-900";
    if (status === "ENROLLED") return "bg-emerald-50 border-emerald-200 text-emerald-900";
    if (status === "WAITLISTED") return "bg-amber-50 border-amber-200 text-amber-900";
    if (status === "SELECTED") return "bg-slate-50 border-slate-200 text-slate-900";
    return "bg-white border-slate-200 text-slate-900";
  }

  return (
    <div className="h-full rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-black/5">
        <div className="text-sm font-semibold text-slate-900">Schedule preview</div>
        <div className="mt-1 text-xs text-slate-500">
          Shows your current selection (Selected/Enrolled/Waitlisted). Conflicts are highlighted in red.
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-[56px_1fr] gap-3">
          <div className="relative">
            <div className="h-[520px]">
              {hours.map((t) => (
                <div key={t} className="h-[52px] flex items-start justify-end pr-1 text-[10px] text-slate-400">
                  {fromMinutes(t)}
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <div className="grid grid-cols-5 gap-2">
              {DAYS.map((d) => (
                <div key={d} className="text-[11px] font-semibold text-slate-600 px-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-5 gap-2">
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="relative h-[520px] rounded-xl border border-slate-200 bg-slate-50/30 overflow-hidden"
                >
                  {hours.map((t) => (
                    <div
                      key={t}
                      className="absolute left-0 right-0 border-t border-slate-200/70"
                      style={{ top: `${((t - minTime) / (maxTime - minTime)) * 100}%` }}
                      aria-hidden="true"
                    />
                  ))}

                  {dayEvents[d].map((e) => {
                    const top = ((e.startMin - minTime) / (maxTime - minTime)) * 100;
                    const height = ((e.endMin - e.startMin) / (maxTime - minTime)) * 100;
                    return (
                      <div
                        key={e.key}
                        className={[
                          "absolute left-2 right-2 rounded-xl border px-2 py-1.5 shadow-sm",
                          "text-[11px] leading-tight",
                          eventTone(e.status, e.conflict),
                        ].join(" ")}
                        style={{ top: `${top}%`, height: `${Math.max(7, height)}%` }}
                        title={`${e.title} · ${e.subtitle}`}
                      >
                        <div className="font-semibold truncate">{e.title}</div>
                        <div className="mt-0.5 opacity-80 truncate">{e.subtitle}</div>
                        <div className="mt-0.5 text-[10px] opacity-70">
                          {fromMinutes(e.startMin)}–{fromMinutes(e.endMin)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-600" aria-hidden="true" />
                Conflict
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-500" aria-hidden="true" />
                Selected
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
                Enrolled
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-600" aria-hidden="true" />
                Waitlisted
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

