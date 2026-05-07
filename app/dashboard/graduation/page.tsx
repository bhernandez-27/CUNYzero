"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { GraduationStatusDTO, GraduationApplyResponse } from "@/app/api/graduation/route";

type PageState = "loading" | "error" | "ready" | "confirming" | "submitting" | "submitted" | "warning";

const REQUIRED = 8;

export default function GraduationPage() {
  const [status, setStatus] = useState<GraduationStatusDTO | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/graduation", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load graduation status");
        const data = (await res.json()) as GraduationStatusDTO;
        setStatus(data);
        setPageState(data.already_applied ? "submitted" : "ready");
      } catch {
        setLoadError("Could not load your graduation status. Try again later.");
        setPageState("error");
      }
    })();
  }, []);

  async function handleApply() {
    setPageState("submitting");
    setSubmitError(null);
    try {
      const res = await fetch("/api/graduation", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as GraduationApplyResponse & { message?: string };

      if (!res.ok) {
        setSubmitError(data.message ?? "Submission failed. Please try again.");
        setPageState("confirming");
        return;
      }

      setResultMessage(data.message ?? null);
      setPageState(data.status === "warning_issued" ? "warning" : "submitted");
    } catch {
      setSubmitError("Network error. Check your connection and try again.");
      setPageState("confirming");
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          <div className="max-w-2xl">
            <div className="text-lg font-semibold text-slate-900">Apply for Graduation</div>
            <div className="mt-1 text-sm text-slate-500">
              Complete {REQUIRED} required courses to become eligible. The Registrar reviews all
              applications before a degree is awarded.
            </div>

            <div className="mt-6">
              {pageState === "loading" && (
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-sm text-slate-500">
                  Loading your graduation status…
                </div>
              )}

              {pageState === "error" && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
                  {loadError}
                </div>
              )}

              {(pageState === "ready" || pageState === "confirming" || pageState === "submitting") && status && (
                <ReadyView
                  status={status}
                  pageState={pageState}
                  submitError={submitError}
                  onConfirm={() => setPageState("confirming")}
                  onCancel={() => setPageState("ready")}
                  onApply={handleApply}
                />
              )}

              {pageState === "submitted" && (
                <OutcomeCard
                  kind="success"
                  title="Application submitted"
                  body={
                    resultMessage ??
                    "Your graduation application has been sent to the Registrar for review. You will be notified of the decision."
                  }
                />
              )}

              {pageState === "warning" && (
                <OutcomeCard
                  kind="warning"
                  title="Application not eligible — warning issued"
                  body={
                    resultMessage ??
                    "You do not meet the 8-course requirement. A warning has been added to your record per college policy."
                  }
                />
              )}
            </div>
          </div>
        }
      />
    </div>
  );
}

function ReadyView({
  status,
  pageState,
  submitError,
  onConfirm,
  onCancel,
  onApply,
}: {
  status: GraduationStatusDTO;
  pageState: PageState;
  submitError: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  onApply: () => void;
}) {
  const completed = status.courses_completed;
  const remaining = Math.max(0, REQUIRED - completed);
  const progressPct = Math.min(100, (completed / REQUIRED) * 100);
  const eligible = status.eligible;
  const confirming = pageState === "confirming";
  const submitting = pageState === "submitting";

  return (
    <div className="space-y-5">
      {/* Progress card */}
      <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Courses completed</div>
            <div className="mt-0.5 text-xs text-slate-500">
              {eligible
                ? "You have met the course requirement."
                : `${remaining} more course${remaining !== 1 ? "s" : ""} needed to be eligible.`}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={["text-3xl font-bold", eligible ? "text-emerald-600" : "text-slate-900"].join(" ")}>
              {completed}
            </span>
            <span className="text-lg font-semibold text-slate-400"> / {REQUIRED}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-3 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={["h-full rounded-full transition-all duration-500", eligible ? "bg-emerald-500" : "bg-[#F07E62]"].join(" ")}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span>0</span>
          <span>{REQUIRED} required</span>
        </div>
      </div>

      {/* Eligibility badge */}
      <div className={[
        "rounded-2xl border px-5 py-4 text-sm",
        eligible
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-slate-200 bg-slate-50 text-slate-700",
      ].join(" ")}>
        {eligible ? (
          <>
            <span className="font-semibold">You are eligible to apply.</span>{" "}
            All course requirements have been met. Submitting this application will send it to the
            Registrar for final verification and degree approval.
          </>
        ) : (
          <>
            <span className="font-semibold">Not yet eligible.</span>{" "}
            You must complete {REQUIRED} required courses before applying. Submitting now will be
            treated as a reckless application and{" "}
            <span className="font-semibold text-red-700">will result in a warning</span> on your
            record.
          </>
        )}
      </div>

      {/* Confirmation step */}
      {confirming && (
        <div className={[
          "rounded-2xl border p-5 space-y-3",
          eligible ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50",
        ].join(" ")}>
          <div className={["text-sm font-semibold", eligible ? "text-emerald-900" : "text-red-900"].join(" ")}>
            {eligible ? "Confirm graduation application" : "⚠ Warning — are you sure?"}
          </div>
          <p className={["text-sm", eligible ? "text-emerald-800" : "text-red-800"].join(" ")}>
            {eligible
              ? "This will submit your application to the Registrar. Once submitted, you cannot cancel it."
              : "You have not completed the required 8 courses. Submitting will result in a warning being added to your record. This cannot be undone."}
          </p>

          {submitError && (
            <div className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-red-800">
              {submitError}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onApply}
              disabled={submitting}
              className={[
                "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition",
                eligible
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-red-600 text-white hover:bg-red-700",
                submitting ? "opacity-60" : "",
              ].join(" ")}
            >
              {submitting ? "Submitting…" : "Yes, submit application"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Apply button (before confirming) */}
      {!confirming && !submitting && (
        <button
          type="button"
          onClick={onConfirm}
          className={[
            "inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition",
            eligible
              ? "bg-[#F07E62] text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97]"
              : "bg-slate-200 text-slate-600 hover:bg-slate-300",
          ].join(" ")}
        >
          {eligible ? "Apply for graduation" : "Apply anyway (not recommended)"}
        </button>
      )}
    </div>
  );
}

function OutcomeCard({ kind, title, body }: { kind: "success" | "warning"; title: string; body: string }) {
  const isSuccess = kind === "success";
  return (
    <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-8 text-center">
      <div className={[
        "mx-auto h-14 w-14 rounded-full border grid place-items-center",
        isSuccess ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200",
      ].join(" ")}>
        {isSuccess ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="mt-4 text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto">{body}</div>
    </div>
  );
}
