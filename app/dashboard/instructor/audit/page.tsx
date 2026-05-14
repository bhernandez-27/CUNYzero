"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";

type AuditFlag = {
  class_id: string;
  course_name: string;
  section_id: string;
  justification_submitted: boolean;
  justification_text: string;
};

export default function InstructorAuditPage() {
  const [flags, setFlags] = useState<AuditFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Per-flag text state: class_id → draft text
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null); // class_id being submitted
  const [submitError, setSubmitError] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/instructor/audit-flags", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load audit flags");
        const data = (await res.json()) as AuditFlag[];
        setFlags(data);
        // Pre-fill drafts with any already-submitted text
        const initial: Record<string, string> = {};
        const alreadySubmitted: Record<string, boolean> = {};
        for (const f of data) {
          initial[f.class_id] = f.justification_text;
          if (f.justification_submitted) alreadySubmitted[f.class_id] = true;
        }
        setDrafts(initial);
        setSubmitted(alreadySubmitted);
      } catch {
        setLoadError("Could not load audit flags. Try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(flag: AuditFlag) {
    const text = (drafts[flag.class_id] ?? "").trim();
    if (!text) {
      setSubmitError((prev) => ({ ...prev, [flag.class_id]: "Please write your justification before submitting." }));
      return;
    }

    setSubmitting(flag.class_id);
    setSubmitError((prev) => ({ ...prev, [flag.class_id]: "" }));

    try {
      const res = await fetch("/api/instructor/justification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: flag.class_id, justification_text: text }),
      });
      const data = (await res.json()) as { status?: string; message?: string };
      if (!res.ok) {
        setSubmitError((prev) => ({ ...prev, [flag.class_id]: data.message ?? "Submission failed. Try again." }));
        return;
      }
      setSubmitted((prev) => ({ ...prev, [flag.class_id]: true }));
    } catch {
      setSubmitError((prev) => ({ ...prev, [flag.class_id]: "Network error. Try again." }));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          <div className="max-w-2xl">
            <div className="text-lg font-semibold text-slate-900">Grade Audit — Justification</div>
            <div className="mt-1 text-sm text-slate-500">
              The Registrar has flagged one or more of your classes for unusual grade distributions
              (too high or too low). Please provide a written explanation for each flagged class.
              Your response will be reviewed before any action is taken.
            </div>

            {loading && (
              <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-sm text-slate-500">
                Loading…
              </div>
            )}

            {loadError && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
                {loadError}
              </div>
            )}

            {!loading && !loadError && flags.length === 0 && (
              <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-center text-sm text-slate-500">
                No justification requests pending. You are all clear.
              </div>
            )}

            {!loading && flags.length > 0 && (
              <div className="mt-6 space-y-5">
                {flags.map((flag) => {
                  const isSubmitting = submitting === flag.class_id;
                  const isDone = submitted[flag.class_id] ?? false;
                  const err = submitError[flag.class_id];

                  return (
                    <div
                      key={flag.class_id}
                      className={[
                        "rounded-2xl border bg-white shadow-sm p-6",
                        isDone ? "border-emerald-200" : "border-amber-200",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{flag.course_name}</div>
                          <div className="mt-0.5 text-xs text-slate-500 font-mono">{flag.section_id}</div>
                        </div>
                        {isDone ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Justification submitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Response required
                          </span>
                        )}
                      </div>

                      <div className="mt-4">
                        <label
                          htmlFor={`just-${flag.class_id}`}
                          className="block text-xs font-semibold text-slate-700"
                        >
                          Your explanation
                        </label>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Explain the grade distribution for this class. Include any relevant context
                          (e.g. assignment difficulty, student effort, attendance patterns).
                        </p>
                        <textarea
                          id={`just-${flag.class_id}`}
                          rows={5}
                          value={drafts[flag.class_id] ?? ""}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [flag.class_id]: e.currentTarget.value }))
                          }
                          disabled={isSubmitting}
                          placeholder="Write your justification here…"
                          className="mt-2 w-full rounded-xl border border-black/10 bg-[#F7F5F1]/50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 disabled:opacity-60 resize-none"
                        />
                      </div>

                      {err && (
                        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                          {err}
                        </div>
                      )}

                      {isDone && (
                        <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                          Your justification has been submitted. The Registrar will review it and take action.
                          You may update your response below until a decision is made.
                        </div>
                      )}

                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => void handleSubmit(flag)}
                          disabled={isSubmitting}
                          className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97] disabled:opacity-60 transition"
                        >
                          {isSubmitting ? "Submitting…" : isDone ? "Update justification" : "Submit justification"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}
