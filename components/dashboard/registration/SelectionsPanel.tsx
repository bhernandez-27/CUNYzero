"use client";

import type { SectionRow } from "./types";
import { fmtSlots } from "./utils";

export default function SelectionsPanel(props: {
  rows: SectionRow[];
  onRemove: (sectionId: string) => void;
  onDrop: (sectionId: string) => void;
}) {
  const active = props.rows.filter((r) => r.status !== "NOT_ENROLLED");

  return (
    <div className="px-5 py-4 border-t border-black/5 bg-slate-50/60">
      <div className="text-xs font-semibold text-slate-700">Your selections</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {active.length === 0 ? (
          <div className="text-xs text-slate-500">No courses selected yet. Pick 2–4, then confirm.</div>
        ) : (
          active.map((r) => (
            <div
              key={r.id}
              className="rounded-xl bg-white border border-black/5 px-3 py-2 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {r.sectionId} <span className="font-normal text-slate-500">· {r.courseName}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500 truncate">{fmtSlots(r.timeSlots)}</div>
              </div>
              <div className="shrink-0">
                {r.status === "SELECTED" ? (
                  <button
                    type="button"
                    onClick={() => props.onRemove(r.sectionId)}
                    className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => props.onDrop(r.sectionId)}
                    className="rounded-lg bg-red-50 border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                  >
                    Drop
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

