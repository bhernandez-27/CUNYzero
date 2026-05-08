"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { ComplaintDTO } from "@/app/api/registrar/complaints/route";

type ResolveAction = "warn_subject" | "dismiss" | "deregister_subject" | "warn_complainant";

type ActiveComplaint = {
  complaint: ComplaintDTO;
  action: ResolveAction | null;
};

const ACTION_LABELS: Record<ResolveAction, string> = {
  warn_subject: "Warn subject",
  dismiss: "Dismiss",
  deregister_subject: "De-register student",
  warn_complainant: "Warn instructor (unfounded)",
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<ComplaintDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [active, setActive] = useState<ActiveComplaint | null>(null);
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/registrar/complaints", { cache: "no-store" });
        if (!res.ok) throw new Error();
        setComplaints((await res.json()) as ComplaintDTO[]);
      } catch {
        setLoadError("Could not load complaints. Try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function getAvailableActions(complaint: ComplaintDTO): ResolveAction[] {
    if (complaint.complainant_role === "instructor" && complaint.subject_type === "student") {
      // Instructor vs student: must warn or de-register the student, OR warn the instructor
      return ["warn_subject", "deregister_subject", "warn_complainant"];
    }
    // Student vs student or student vs instructor
    return ["warn_subject", "dismiss"];
  }

  async function handleResolve(complaint: ComplaintDTO, action: ResolveAction) {
    setProcessing(true);
    setActionError(null);
    try {
      const res = await fetch("/api/registrar/complaints", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ complaint_id: complaint.complaint_id, action }),
      });
      const payload = (await res.json()) as { status?: string; message?: string };
      if (!res.ok) {
        setActionError(payload.message ?? "Could not resolve complaint. Try again.");
        setProcessing(false);
        return;
      }
      setComplaints((prev) => prev.filter((c) => c.complaint_id !== complaint.complaint_id));
      setActive(null);
    } catch {
      setActionError("Network error. Check your connection and try again.");
    } finally {
      setProcessing(false);
    }
  }

  const openComplaints = complaints.filter((c) => c.status === "OPEN");

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          <div className="max-w-3xl">
            <div className="text-lg font-semibold text-slate-900">Complaints</div>
            <div className="mt-1 text-sm text-slate-500">
              Review and resolve open complaints. All parties are notified of the outcome.
            </div>

            {/* Action panel */}
            {active && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
                <div className="text-sm font-semibold text-slate-900">
                  Resolve complaint — {active.complaint.complainant_name} → {active.complaint.subject_name}
                </div>
                <p className="text-sm text-slate-600 line-clamp-3">{active.complaint.description}</p>

                <div className="flex flex-wrap gap-2">
                  {getAvailableActions(active.complaint).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setActive({ ...active, action: a })}
                      disabled={processing}
                      className={[
                        "inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold border transition",
                        active.action === a
                          ? "bg-neutral-900 border-neutral-900 text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {ACTION_LABELS[a]}
                    </button>
                  ))}
                </div>

                {actionError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {actionError}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => active.action && void handleResolve(active.complaint, active.action)}
                    disabled={!active.action || processing}
                    className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97] transition disabled:opacity-50"
                  >
                    {processing ? "Processing…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActive(null); setActionError(null); }}
                    disabled={processing}
                    className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-sm text-slate-500">
                  Loading complaints…
                </div>
              ) : loadError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
                  {loadError}
                </div>
              ) : openComplaints.length === 0 ? (
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-center text-sm text-slate-500">
                  No open complaints. All caught up.
                </div>
              ) : (
                openComplaints.map((c) => (
                  <ComplaintCard
                    key={c.complaint_id}
                    complaint={c}
                    isActive={active?.complaint.complaint_id === c.complaint_id}
                    disabled={active !== null && active.complaint.complaint_id !== c.complaint_id}
                    onOpen={() => setActive({ complaint: c, action: null })}
                  />
                ))
              )}
            </div>
          </div>
        }
      />
    </div>
  );
}

function ComplaintCard({
  complaint,
  isActive,
  disabled,
  onOpen,
}: {
  complaint: ComplaintDTO;
  isActive: boolean;
  disabled: boolean;
  onOpen: () => void;
}) {
  const typeLabel =
    complaint.complainant_role === "instructor"
      ? "Instructor → Student"
      : complaint.subject_type === "instructor"
        ? "Student → Instructor"
        : "Student → Student";

  const typeBadgeStyle =
    complaint.complainant_role === "instructor"
      ? "border-red-200 bg-red-50 text-red-700"
      : complaint.subject_type === "instructor"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div
      className={[
        "rounded-2xl bg-white border shadow-sm px-5 py-4 transition",
        isActive ? "border-[#F07E62]/40 ring-1 ring-[#F07E62]/20" : "border-black/5",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">
              {complaint.complainant_name}
            </span>
            <span className="text-xs text-slate-400">→</span>
            <span className="text-sm font-semibold text-slate-900">{complaint.subject_name}</span>
            <span className={["inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", typeBadgeStyle].join(" ")}>
              {typeLabel}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">{complaint.description}</p>
          <div className="mt-1.5 text-xs text-slate-400">
            Filed {new Date(complaint.filed_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          disabled={disabled}
          className={[
            "shrink-0 inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold border transition",
            isActive
              ? "bg-neutral-900 border-neutral-900 text-white"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40",
          ].join(" ")}
        >
          {isActive ? "Resolving…" : "Review"}
        </button>
      </div>
    </div>
  );
}
