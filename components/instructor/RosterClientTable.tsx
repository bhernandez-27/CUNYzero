"use client";

import { useState } from "react";
import type { ClassRosterDTO, RosterStudentDTO } from "@/lib/instructor/types";

const GRADE_COLORS: Record<string, string> = {
  A: "border-emerald-200 bg-emerald-50 text-emerald-800",
  B: "border-sky-200 bg-sky-50 text-sky-800",
  C: "border-amber-200 bg-amber-50 text-amber-800",
  D: "border-orange-200 bg-orange-50 text-orange-800",
  F: "border-red-200 bg-red-50 text-red-800",
};

type Toast = { id: string; kind: "success" | "error"; title: string; message?: string };

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function RosterClientTable({ roster }: { roster: ClassRosterDTO }) {
  const [warningTarget, setWarningTarget] = useState<RosterStudentDTO | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function pushToast(t: Omit<Toast, "id">) {
    const id = uid();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }

  function openWarningForm(student: RosterStudentDTO) {
    setWarningTarget(student);
    setReason("");
  }

  function closeWarningForm() {
    setWarningTarget(null);
    setReason("");
  }

  async function submitWarning() {
    if (!warningTarget || !reason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/instructor/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: warningTarget.student_id,
          class_id: roster.class_id,
          reason: reason.trim(),
        }),
      });
      const data = (await res.json()) as { status?: string; message?: string; error?: string };
      if (!res.ok) {
        pushToast({ kind: "error", title: data.error ?? "Failed to issue warning", message: data.message });
        return;
      }
      pushToast({ kind: "success", title: "Warning issued", message: `Warning sent to ${warningTarget.student_name}.` });
      closeWarningForm();
    } catch {
      pushToast({ kind: "error", title: "Network error", message: "Could not reach the server." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Toasts */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg text-sm max-w-xs",
              t.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900",
            ].join(" ")}
          >
            <span
              className={[
                "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                t.kind === "success" ? "bg-emerald-500" : "bg-red-500",
              ].join(" ")}
            />
            <div>
              <div className="font-semibold">{t.title}</div>
              {t.message && <div className="text-xs opacity-80 mt-0.5">{t.message}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Warning form */}
      {warningTarget && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="text-sm font-semibold text-amber-900 mb-1">
            Issue Warning — {warningTarget.student_name}
          </div>
          <div className="text-xs text-amber-700 mb-3">
            Provide a clear reason. The student will be notified and the warning will be logged.
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            placeholder="Describe the policy violation or reason for the warning…"
            rows={3}
            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300/50 resize-none"
          />
          <div className="mt-3 flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={closeWarningForm}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitWarning}
              disabled={submitting || !reason.trim()}
              className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:brightness-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Issuing…" : "Issue Warning"}
            </button>
          </div>
        </div>
      )}

      {/* Roster table */}
      <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm p-6">
        <div className="text-sm font-semibold text-slate-900 mb-4">
          Enrolled Students ({roster.students.length})
        </div>

        {roster.students.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-10 text-center text-slate-500 text-sm">
            No students enrolled.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-3 pr-4 font-semibold">Student</th>
                  <th className="pb-3 pr-4 font-semibold">Email</th>
                  <th className="pb-3 pr-4 font-semibold">ID</th>
                  <th className="pb-3 pr-4 font-semibold">Grade</th>
                  <th className="pb-3 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.students.map((s) => (
                  <tr
                    key={s.enrollment_id}
                    className={warningTarget?.student_id === s.student_id ? "bg-amber-50/50" : "text-slate-700"}
                  >
                    <td className="py-3 pr-4 font-medium text-slate-900">{s.student_name}</td>
                    <td className="py-3 pr-4 text-slate-500">{s.email}</td>
                    <td className="py-3 pr-4 text-slate-400 text-xs font-mono">{s.student_id}</td>
                    <td className="py-3 pr-4">
                      {s.grade ? (
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                            GRADE_COLORS[s.grade] ?? "border-slate-200 bg-slate-50 text-slate-800",
                          ].join(" ")}
                        >
                          {s.grade}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Pending</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          warningTarget?.student_id === s.student_id
                            ? closeWarningForm()
                            : openWarningForm(s)
                        }
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
                      >
                        {warningTarget?.student_id === s.student_id ? "Cancel" : "Warn"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
