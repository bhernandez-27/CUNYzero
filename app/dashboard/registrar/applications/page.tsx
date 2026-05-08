"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type {
  ApplicationsDTO,
  StudentApplicationDTO,
  InstructorApplicationDTO,
} from "@/app/api/registrar/applications/route";

type Tab = "students" | "instructors";
type ActionState = "idle" | "confirming_reject" | "processing";

type PendingAction = {
  app: StudentApplicationDTO | InstructorApplicationDTO;
  decision: "APPROVED" | "REJECTED";
};

export default function ApplicationsPage() {
  const [data, setData] = useState<ApplicationsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("students");

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [justification, setJustification] = useState("");
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/registrar/applications", { cache: "no-store" });
        if (!res.ok) throw new Error();
        setData((await res.json()) as ApplicationsDTO);
      } catch {
        setLoadError("Could not load applications. Try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function startAction(app: StudentApplicationDTO | InstructorApplicationDTO, decision: "APPROVED" | "REJECTED") {
    // Rejecting a qualified student (GPA > 3.0) requires justification
    const needsJustification =
      decision === "REJECTED" && app.type === "student" && (app as StudentApplicationDTO).prior_gpa > 3.0;

    setPending({ app, decision });
    setJustification("");
    setActionError(null);
    setActionState(needsJustification ? "confirming_reject" : "processing");

    if (!needsJustification) {
      void submitAction(app, decision, "");
    }
  }

  async function submitAction(
    app: StudentApplicationDTO | InstructorApplicationDTO,
    decision: "APPROVED" | "REJECTED",
    just: string,
  ) {
    setActionState("processing");
    setActionError(null);
    try {
      const res = await fetch("/api/registrar/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          application_id: app.application_id,
          type: app.type,
          decision,
          justification: just || undefined,
        }),
      });
      const payload = (await res.json()) as { status?: string; message?: string; error?: string };
      if (!res.ok) {
        setActionError(payload.message ?? "Action failed. Please try again.");
        setActionState(just ? "confirming_reject" : "idle");
        return;
      }
      // Remove from local list
      setData((prev) => {
        if (!prev) return prev;
        return {
          students: prev.students.filter((s) => s.application_id !== app.application_id),
          instructors: prev.instructors.filter((i) => i.application_id !== app.application_id),
        };
      });
      setPending(null);
      setActionState("idle");
    } catch {
      setActionError("Network error. Check your connection and try again.");
      setActionState(just ? "confirming_reject" : "idle");
    }
  }

  function cancelAction() {
    setPending(null);
    setJustification("");
    setActionError(null);
    setActionState("idle");
  }

  const pendingStudents = data?.students.filter((s) => s.status === "PENDING") ?? [];
  const pendingInstructors = data?.instructors.filter((i) => i.status === "PENDING") ?? [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          <div className="max-w-3xl">
            <div className="text-lg font-semibold text-slate-900">Applications</div>
            <div className="mt-1 text-sm text-slate-500">
              Review and process pending student and instructor applications.
            </div>

            {/* Tabs */}
            <div className="mt-5 flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
              {(["students", "instructors"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={[
                    "rounded-lg px-4 py-1.5 text-sm font-semibold transition capitalize",
                    tab === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700",
                  ].join(" ")}
                >
                  {t}
                  {!loading && data && (
                    <span className={["ml-1.5 text-xs rounded-full px-1.5 py-0.5", tab === t ? "bg-slate-100" : "bg-slate-200"].join(" ")}>
                      {t === "students" ? pendingStudents.length : pendingInstructors.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Justification panel */}
            {actionState === "confirming_reject" && pending && (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
                <div className="text-sm font-semibold text-amber-900">Justification required</div>
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">{pending.app.full_name}</span> has a GPA above 3.0.
                  Rejecting a qualified applicant requires a written explanation.
                </p>
                <textarea
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Enter your justification…"
                  className="w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50"
                />
                {actionError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {actionError}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void submitAction(pending.app, pending.decision, justification)}
                    disabled={!justification.trim()}
                    className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
                  >
                    Reject with justification
                  </button>
                  <button type="button" onClick={cancelAction} className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-sm text-slate-500">
                  Loading applications…
                </div>
              ) : loadError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
                  {loadError}
                </div>
              ) : tab === "students" ? (
                pendingStudents.length === 0 ? (
                  <EmptyState message="No pending student applications." />
                ) : (
                  pendingStudents.map((app) => (
                    <StudentCard
                      key={app.application_id}
                      app={app}
                      disabled={actionState === "processing" || (pending?.app.application_id === app.application_id && actionState === "confirming_reject")}
                      onApprove={() => startAction(app, "APPROVED")}
                      onReject={() => startAction(app, "REJECTED")}
                    />
                  ))
                )
              ) : pendingInstructors.length === 0 ? (
                <EmptyState message="No pending instructor applications." />
              ) : (
                pendingInstructors.map((app) => (
                  <InstructorCard
                    key={app.application_id}
                    app={app}
                    disabled={actionState === "processing"}
                    onApprove={() => startAction(app, "APPROVED")}
                    onReject={() => startAction(app, "REJECTED")}
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

function StudentCard({
  app,
  disabled,
  onApprove,
  onReject,
}: {
  app: StudentApplicationDTO;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const highGpa = app.prior_gpa >= 3.0;
  return (
    <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{app.full_name}</span>
            <span
              className={[
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                highGpa
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-slate-50 border-slate-200 text-slate-500",
              ].join(" ")}
            >
              GPA {app.prior_gpa.toFixed(2)}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-slate-500">{app.email}</div>
          <div className="mt-1 text-xs text-slate-400">
            Applied {new Date(app.applied_at).toLocaleDateString()}
            {highGpa && (
              <span className="ml-2 text-amber-600 font-medium">
                · Rejecting requires justification
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onApprove}
            disabled={disabled}
            className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={disabled}
            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function InstructorCard({
  app,
  disabled,
  onApprove,
  onReject,
}: {
  app: InstructorApplicationDTO;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{app.full_name}</span>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              {app.field_of_expertise}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-slate-500">{app.email}</div>
          <div className="mt-1.5 text-xs text-slate-600 line-clamp-2">{app.credentials_summary}</div>
          <div className="mt-1 text-xs text-slate-400">
            Applied {new Date(app.applied_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onApprove}
            disabled={disabled}
            className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={disabled}
            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
