"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { GraduationApplicationDTO } from "@/app/api/registrar/graduation/route";

type ActionState = "idle" | "processing";

export default function RegistrarGraduationPage() {
  const [applications, setApplications] = useState<GraduationApplicationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<GraduationApplicationDTO | null>(null);
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/registrar/graduation", { cache: "no-store" });
        if (!res.ok) throw new Error();
        setApplications((await res.json()) as GraduationApplicationDTO[]);
      } catch {
        setLoadError("Could not load graduation applications. Try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleDecision(app: GraduationApplicationDTO, decision: "APPROVED" | "REJECTED") {
    setActionState("processing");
    setActionError(null);
    try {
      const res = await fetch("/api/registrar/graduation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ application_id: app.application_id, decision }),
      });
      const payload = (await res.json()) as { status?: string; message?: string };
      if (!res.ok) {
        setActionError(payload.message ?? "Action failed. Please try again.");
        setActionState("idle");
        return;
      }
      setApplications((prev) => prev.filter((a) => a.application_id !== app.application_id));
      setSelected(null);
      setActionState("idle");
    } catch {
      setActionError("Network error. Check your connection and try again.");
      setActionState("idle");
    }
  }

  const pending = applications.filter((a) => a.status === "PENDING");
  const eligible = pending.filter((a) => a.eligible);
  const ineligible = pending.filter((a) => !a.eligible);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          <div className="max-w-2xl">
            <div className="text-lg font-semibold text-slate-900">Graduation Applications</div>
            <div className="mt-1 text-sm text-slate-500">
              Review pending graduation requests. Approving a student awards their degree and
              removes them from the active system. Rejecting an ineligible applicant issues a
              warning automatically.
            </div>

            {/* Review panel */}
            {selected && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
                <div className="text-sm font-semibold text-slate-900">
                  Reviewing — {selected.student_name}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-center">
                    <div className={["text-xl font-bold", selected.cumulative_gpa != null && selected.cumulative_gpa >= 3.5 ? "text-emerald-600" : selected.cumulative_gpa != null && selected.cumulative_gpa < 2.25 ? "text-red-600" : "text-slate-900"].join(" ")}>
                      {selected.cumulative_gpa?.toFixed(2) ?? "—"}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Cumulative GPA</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-center">
                    <div className={["text-xl font-bold", selected.eligible ? "text-emerald-600" : "text-red-600"].join(" ")}>
                      {selected.courses_completed}/{selected.courses_required}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Courses completed</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-center">
                    <div className={["text-xl font-bold", selected.eligible ? "text-emerald-600" : "text-red-600"].join(" ")}>
                      {selected.eligible ? "Yes" : "No"}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Eligible</div>
                  </div>
                </div>

                {!selected.eligible && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <span className="font-semibold">Reckless application.</span> This student has
                    only completed {selected.courses_completed} of {selected.courses_required} required
                    courses. Rejecting will automatically issue them 1 warning per policy.
                  </div>
                )}

                {selected.eligible && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <span className="font-semibold">Requirements met.</span> Approving will award
                    a Bachelor's degree and permanently remove this student from the active system.
                  </div>
                )}

                {actionError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {actionError}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  {selected.eligible && (
                    <button
                      type="button"
                      onClick={() => void handleDecision(selected, "APPROVED")}
                      disabled={actionState === "processing"}
                      className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-60"
                    >
                      {actionState === "processing" ? "Processing…" : "Approve & Award Degree"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDecision(selected, "REJECTED")}
                    disabled={actionState === "processing"}
                    className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-60"
                  >
                    {actionState === "processing" ? "Processing…" : selected.eligible ? "Reject" : "Reject & Issue Warning"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelected(null); setActionError(null); }}
                    disabled={actionState === "processing"}
                    className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-5">
              {loading ? (
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-sm text-slate-500">
                  Loading graduation applications…
                </div>
              ) : loadError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
                  {loadError}
                </div>
              ) : pending.length === 0 ? (
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-center text-sm text-slate-500">
                  No pending graduation applications.
                </div>
              ) : (
                <>
                  {eligible.length > 0 && (
                    <section>
                      <div className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Eligible — completed all {eligible[0]?.courses_required} courses ({eligible.length})
                      </div>
                      <div className="space-y-3">
                        {eligible.map((app) => (
                          <ApplicationCard
                            key={app.application_id}
                            app={app}
                            isSelected={selected?.application_id === app.application_id}
                            disabled={selected !== null && selected.application_id !== app.application_id}
                            onSelect={() => { setSelected(app); setActionError(null); }}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {ineligible.length > 0 && (
                    <section>
                      <div className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Ineligible — reckless applications ({ineligible.length})
                      </div>
                      <div className="space-y-3">
                        {ineligible.map((app) => (
                          <ApplicationCard
                            key={app.application_id}
                            app={app}
                            isSelected={selected?.application_id === app.application_id}
                            disabled={selected !== null && selected.application_id !== app.application_id}
                            onSelect={() => { setSelected(app); setActionError(null); }}
                          />
                        ))}
                      </div>
                    </section>
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

function ApplicationCard({
  app,
  isSelected,
  disabled,
  onSelect,
}: {
  app: GraduationApplicationDTO;
  isSelected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={[
        "rounded-2xl bg-white border shadow-sm px-5 py-4 flex items-center justify-between gap-4 transition",
        isSelected
          ? "border-[#F07E62]/40 ring-1 ring-[#F07E62]/20"
          : app.eligible
            ? "border-black/5"
            : "border-amber-200",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-900">{app.student_name}</span>
          {app.eligible ? (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Eligible
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              Not eligible
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">{app.email}</div>
        <div className="mt-1 text-xs text-slate-400">
          GPA {app.cumulative_gpa?.toFixed(2) ?? "—"} · {app.courses_completed}/{app.courses_required} courses ·
          Applied {new Date(app.applied_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
        </div>
      </div>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={[
          "shrink-0 inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold border transition",
          isSelected
            ? "bg-neutral-900 border-neutral-900 text-white"
            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40",
        ].join(" ")}
      >
        {isSelected ? "Reviewing…" : "Review"}
      </button>
    </div>
  );
}
