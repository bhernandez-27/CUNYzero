"use client";

import type { RowStatus, SectionRow } from "./types";
import { fmtSlots } from "./utils";

type ActionKind = "register" | "remove" | "drop";

export default function RegistrationTable(props: {
  rows: SectionRow[];
  busyRowId: string | null;
  confirming: boolean;
  onAction: (kind: ActionKind, sectionId: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500">
            <th className="py-3 px-5 font-semibold">Course</th>
            <th className="py-3 px-5 font-semibold">Section ID</th>
            <th className="py-3 px-5 font-semibold">Instructor</th>
            <th className="py-3 px-5 font-semibold">Time slots</th>
            <th className="py-3 px-5 font-semibold">Seats</th>
            <th className="py-3 px-5 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {props.rows.map((r) => {
            const isBusy = props.busyRowId === r.id;
            const enrolled = r.status === "ENROLLED";
            const waitlisted = r.status === "WAITLISTED";
            const selected = r.status === "SELECTED";

            return (
              <tr key={r.id} className="text-slate-700">
                <td className="py-3 px-5">
                  <div className="font-semibold text-slate-900">{r.courseName}</div>
                  {r.status !== "NOT_ENROLLED" ? (
                    <div className="mt-1 text-xs">
                      <StatusPill status={r.status} />
                    </div>
                  ) : null}
                </td>
                <td className="py-3 px-5 font-mono text-xs text-slate-700">{r.sectionId}</td>
                <td className="py-3 px-5">{r.instructor}</td>
                <td className="py-3 px-5 text-slate-600">{fmtSlots(r.timeSlots)}</td>
                <td className="py-3 px-5">
                  <span
                    className={[
                      "inline-flex items-center gap-2 text-xs font-semibold",
                      r.seatsAvailable > 0 ? "text-slate-700" : "text-amber-800",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-2 w-2 rounded-full",
                        r.seatsAvailable > 0 ? "bg-emerald-500" : "bg-amber-500",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                    {r.seatsAvailable > 0 ? `${r.seatsAvailable} open` : "Full"}
                  </span>
                </td>
                <td className="py-3 px-5 text-right">
                  {r.status === "NOT_ENROLLED" ? (
                    <button
                      type="button"
                      disabled={isBusy || props.confirming}
                      onClick={() => props.onAction("register", r.sectionId)}
                      className={[
                        "inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold transition",
                        "bg-[#F07E62] text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97] active:brightness-[0.95]",
                        isBusy ? "opacity-70" : "",
                      ].join(" ")}
                    >
                      {isBusy ? "Selecting…" : "Select"}
                    </button>
                  ) : selected ? (
                    <button
                      type="button"
                      disabled={props.confirming}
                      onClick={() => props.onAction("remove", r.sectionId)}
                      className="inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold transition bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={props.confirming}
                      onClick={() => props.onAction("drop", r.sectionId)}
                      className="inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold transition bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                    >
                      Drop
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill(props: { status: Exclude<RowStatus, "NOT_ENROLLED"> }) {
  const { label, outer, dot } = pillTone(props.status);
  return (
    <span className={["inline-flex items-center gap-2 rounded-full px-2.5 py-1 font-semibold border", outer].join(" ")}>
      <span className={["h-2 w-2 rounded-full", dot].join(" ")} aria-hidden="true" />
      {label}
    </span>
  );
}

function pillTone(status: Exclude<RowStatus, "NOT_ENROLLED">): { label: string; outer: string; dot: string } {
  switch (status) {
    case "ENROLLED":
      return { label: "ENROLLED", outer: "bg-emerald-50 text-emerald-800 border-emerald-200", dot: "bg-emerald-600" };
    case "WAITLISTED":
      return { label: "WAITLISTED", outer: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-600" };
    case "SELECTED":
      return { label: "SELECTED", outer: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-600" };
  }
}

