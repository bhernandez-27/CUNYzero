"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { ClassGradeAuditDTO } from "@/app/api/registrar/grade-audit/route";

// Actions that fully resolve the flag
type FinalAction = "warn_instructor" | "dismiss_instructor" | "dismiss_flag";
// The initial step before a final decision
type RequestAction = "request_justification";
type AuditAction = RequestAction | FinalAction;

const FINAL_ACTION_LABELS: Record<FinalAction, string> = {
  warn_instructor: "Warn instructor",
  dismiss_instructor: "Dismiss instructor",
  dismiss_flag: "Clear flag — no action needed",
};

const FINAL_ACTION_STYLES: Record<FinalAction, string> = {
  warn_instructor: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  dismiss_instructor: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  dismiss_flag: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
};

type ActiveAudit = {
  cls: ClassGradeAuditDTO;
  action: FinalAction | null;
};

export default function GradeAuditPage() {
  const [classes, setClasses] = useState<ClassGradeAuditDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [active, setActive] = useState<ActiveAudit | null>(null);
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/registrar/grade-audit", { cache: "no-store" });
        if (!res.ok) throw new Error();
        setClasses((await res.json()) as ClassGradeAuditDTO[]);
      } catch {
        setLoadError("Could not load grade audit data. Try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleAction(cls: ClassGradeAuditDTO, action: AuditAction) {
    setProcessing(true);
    setActionError(null);
    try {
      const res = await fetch("/api/registrar/grade-audit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ class_id: cls.class_id, action }),
      });
      const payload = (await res.json()) as { status?: string; message?: string };
      if (!res.ok) {
        setActionError(payload.message ?? "Could not process action. Try again.");
        setProcessing(false);
        return;
      }

      if (action === "request_justification") {
        // Flag stays open — just mark justification as requested
        setClasses((prev) =>
          prev.map((c) =>
            c.class_id === cls.class_id ? { ...c, justification_requested: true } : c,
          ),
        );
        setActive(null);
      } else {
        // Final action — resolve the flag
        setClasses((prev) =>
          prev.map((c) =>
            c.class_id === cls.class_id ? { ...c, resolved: true, flagged: false } : c,
          ),
        );
        setActive(null);
      }
    } catch {
      setActionError("Network error. Check your connection and try again.");
    } finally {
      setProcessing(false);
    }
  }

  const flagged = classes.filter((c) => c.flagged && !c.resolved);
  const clean = classes.filter((c) => !c.flagged || c.resolved);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          <div className="max-w-3xl">
            <div className="text-lg font-semibold text-slate-900">Grade Audit</div>
            <div className="mt-1 text-sm text-slate-500">
              Classes with a GPA above 3.5 or below 2.5 are flagged automatically. You can request
              a justification from the instructor first, then decide whether to warn, dismiss, or
              clear the flag.
            </div>

            {/* Review panel */}
            {active && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {active.cls.course_name} ({active.cls.section_id})
                  </div>
                  <div className="mt-0.5 text-sm text-slate-600">
                    Instructor: <span className="font-medium">{active.cls.instructor_name}</span>
                    {" · "}Class GPA:{" "}
                    <span className={["font-bold", active.cls.flag_reason === "TOO_HIGH" ? "text-amber-600" : "text-red-600"].join(" ")}>
                      {active.cls.class_gpa?.toFixed(2)}
                    </span>
                    <span className="text-slate-400">
                      {active.cls.flag_reason === "TOO_HIGH" && " (above 3.5 — possible grade inflation)"}
                      {active.cls.flag_reason === "TOO_LOW" && " (below 2.5 — possible unfair grading)"}
                    </span>
                  </div>
                </div>

                {/* Step 1 — request justification */}
                {!active.cls.justification_requested && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-700">Step 1 — Ask the instructor</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Send the instructor a notification asking them to explain this GPA distribution.
                        The flag stays open until you take a final action.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAction(active.cls, "request_justification")}
                      disabled={processing}
                      className="shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                    >
                      {processing ? "Sending…" : "Request justification"}
                    </button>
                  </div>
                )}

                {active.cls.justification_requested && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
                    <span className="font-semibold">Justification requested.</span> The instructor has been notified.
                    Once you have reviewed their response, take a final action below.
                  </div>
                )}

                {/* Step 2 — final action */}
                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    {active.cls.justification_requested ? "Step 2 — Final decision" : "Or take immediate action"}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(FINAL_ACTION_LABELS) as FinalAction[]).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setActive({ ...active, action: a })}
                        disabled={processing}
                        className={[
                          "inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold border transition",
                          active.action === a
                            ? "bg-neutral-900 border-neutral-900 text-white"
                            : FINAL_ACTION_STYLES[a],
                        ].join(" ")}
                      >
                        {FINAL_ACTION_LABELS[a]}
                      </button>
                    ))}
                  </div>
                </div>

                {actionError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {actionError}
                  </div>
                )}

                <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => active.action && void handleAction(active.cls, active.action)}
                    disabled={!active.action || processing}
                    className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97] transition disabled:opacity-50"
                  >
                    {processing ? "Processing…" : "Confirm action"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActive(null); setActionError(null); }}
                    disabled={processing}
                    className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-5">
              {loading ? (
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-sm text-slate-500">
                  Loading grade data…
                </div>
              ) : loadError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
                  {loadError}
                </div>
              ) : (
                <>
                  {flagged.length > 0 && (
                    <section>
                      <div className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Flagged — requires review ({flagged.length})
                      </div>
                      <div className="space-y-3">
                        {flagged.map((c) => (
                          <AuditCard
                            key={c.class_id}
                            cls={c}
                            isActive={active?.cls.class_id === c.class_id}
                            disabled={active !== null && active.cls.class_id !== c.class_id}
                            onOpen={() => { setActive({ cls: c, action: null }); setActionError(null); }}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {clean.length > 0 && (
                    <section>
                      <div className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        All classes
                      </div>
                      <div className="space-y-3">
                        {clean.map((c) => (
                          <AuditCard
                            key={c.class_id}
                            cls={c}
                            isActive={false}
                            disabled={active !== null}
                            onOpen={() => {}}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {classes.length === 0 && (
                    <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-center text-sm text-slate-500">
                      No grade data available. Grades are published during the Grading period.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        }
      />
    </div>
  );
}

function AuditCard({
  cls,
  isActive,
  disabled,
  onOpen,
}: {
  cls: ClassGradeAuditDTO;
  isActive: boolean;
  disabled: boolean;
  onOpen: () => void;
}) {
  const gpa = cls.class_gpa;
  const flagHigh = cls.flag_reason === "TOO_HIGH";
  const flagLow = cls.flag_reason === "TOO_LOW";

  const gpaColor =
    gpa == null ? "text-slate-400"
    : flagHigh ? "text-amber-600"
    : flagLow ? "text-red-600"
    : "text-emerald-600";

  return (
    <div
      className={[
        "rounded-2xl bg-white border shadow-sm px-5 py-4 transition",
        isActive
          ? "border-[#F07E62]/40 ring-1 ring-[#F07E62]/20"
          : cls.flagged && !cls.resolved
            ? "border-amber-200"
            : "border-black/5",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{cls.course_name}</span>
            <span className="font-mono text-xs text-slate-400">{cls.section_id}</span>
            {cls.flagged && !cls.resolved && (
              <span className={["inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", flagHigh ? "border-amber-200 bg-amber-50 text-amber-700" : "border-red-200 bg-red-50 text-red-700"].join(" ")}>
                {flagHigh ? "GPA too high" : "GPA too low"}
              </span>
            )}
            {cls.justification_requested && !cls.resolved && (
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                Justification requested
              </span>
            )}
            {cls.resolved && (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Resolved
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {cls.instructor_name} · {cls.student_count} students
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className={["text-xl font-bold", gpaColor].join(" ")}>
              {gpa != null ? gpa.toFixed(2) : "—"}
            </div>
            <div className="text-[10px] text-slate-400">class GPA</div>
          </div>
          {cls.flagged && !cls.resolved && (
            <button
              type="button"
              onClick={onOpen}
              disabled={disabled}
              className={[
                "inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold border transition",
                isActive
                  ? "bg-neutral-900 border-neutral-900 text-white"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40",
              ].join(" ")}
            >
              {isActive ? "Reviewing…" : "Review"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
