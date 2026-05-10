"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { EnrolledCourseDTO } from "@/app/api/registration/drop/route";

export default function DropCoursePage() {
  const [enrollments, setEnrollments] = useState<EnrolledCourseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Which card is currently expanded into confirm mode
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [droppingId, setDroppingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    void loadEnrollments();
  }, []);

  async function loadEnrollments() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/registration/drop", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setEnrollments((await res.json()) as EnrolledCourseDTO[]);
    } catch {
      setLoadError("Could not load your current enrollments. Try again later.");
    } finally {
      setLoading(false);
    }
  }

  function handleDropClick(id: string) {
    setConfirmingId(id);
    setErrorId(null);
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  function handleCancel() {
    setConfirmingId(null);
    setErrorId(null);
    setErrorMsg(null);
  }

  async function handleConfirm(enrollment: EnrolledCourseDTO) {
    setDroppingId(enrollment.enrollment_id);
    setErrorId(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/registration/drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enrollment_id: enrollment.enrollment_id }),
      });

      const data = (await res.json()) as { status?: string; message?: string; error?: string };

      if (!res.ok) {
        setErrorId(enrollment.enrollment_id);
        setErrorMsg(data.message ?? "Drop request failed. Please try again.");
        setConfirmingId(null);
        return;
      }

      // Remove from local list immediately — no reload needed
      setEnrollments((prev) => prev.filter((e) => e.enrollment_id !== enrollment.enrollment_id));
      setConfirmingId(null);
      setSuccessMsg(`${enrollment.course_name} has been dropped from your schedule.`);
    } catch {
      setErrorId(enrollment.enrollment_id);
      setErrorMsg("Network error. Check your connection and try again.");
      setConfirmingId(null);
    } finally {
      setDroppingId(null);
    }
  }

  const activeEnrollments = enrollments.filter((e) => e.status === "ENROLLED");
  const waitlistEnrollments = enrollments.filter((e) => e.status === "WAITLISTED");

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          <div className="max-w-2xl">
            <div className="text-lg font-semibold text-slate-900">Drop a Course</div>
            <div className="mt-1 text-sm text-slate-500">
              You must remain enrolled in at least 2 courses. Drops are only permitted during the
              registration period.
            </div>

            {/* Global success banner */}
            {successMsg && (
              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4">
                <div className="h-9 w-9 rounded-full bg-emerald-50 border border-emerald-200 grid place-items-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Course dropped</div>
                  <div className="text-xs text-slate-500 mt-0.5">{successMsg}</div>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-4">
              {loading ? (
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-sm text-slate-500">
                  Loading your enrollments…
                </div>
              ) : loadError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
                  {loadError}
                </div>
              ) : enrollments.length === 0 ? (
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-center text-sm text-slate-500">
                  You are not currently enrolled in any courses.
                </div>
              ) : (
                <>
                  {activeEnrollments.length > 0 && (
                    <section>
                      <div className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Enrolled
                      </div>
                      <div className="space-y-3">
                        {activeEnrollments.map((e) => (
                          <CourseCard
                            key={e.enrollment_id}
                            enrollment={e}
                            isConfirming={confirmingId === e.enrollment_id}
                            isDropping={droppingId === e.enrollment_id}
                            isLocked={confirmingId !== null && confirmingId !== e.enrollment_id}
                            error={errorId === e.enrollment_id ? errorMsg : null}
                            onDrop={() => handleDropClick(e.enrollment_id)}
                            onConfirm={() => void handleConfirm(e)}
                            onCancel={handleCancel}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {waitlistEnrollments.length > 0 && (
                    <section>
                      <div className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Waitlisted
                      </div>
                      <div className="space-y-3">
                        {waitlistEnrollments.map((e) => (
                          <CourseCard
                            key={e.enrollment_id}
                            enrollment={e}
                            isConfirming={confirmingId === e.enrollment_id}
                            isDropping={droppingId === e.enrollment_id}
                            isLocked={confirmingId !== null && confirmingId !== e.enrollment_id}
                            error={errorId === e.enrollment_id ? errorMsg : null}
                            onDrop={() => handleDropClick(e.enrollment_id)}
                            onConfirm={() => void handleConfirm(e)}
                            onCancel={handleCancel}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              Dropping a course may affect your enrollment count. Students enrolled in fewer than 2
              courses at the start of Class Running receive an automatic warning.
            </div>
          </div>
        }
      />
    </div>
  );
}

function CourseCard({
  enrollment,
  isConfirming,
  isDropping,
  isLocked,
  error,
  onDrop,
  onConfirm,
  onCancel,
}: {
  enrollment: EnrolledCourseDTO;
  isConfirming: boolean;
  isDropping: boolean;
  isLocked: boolean;
  error: string | null;
  onDrop: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const slots = enrollment.time_slots.map((t) => `${t.day} ${t.start}–${t.end}`).join(" · ");

  return (
    <div
      className={[
        "rounded-2xl bg-white border shadow-sm overflow-hidden transition-all",
        isConfirming ? "border-red-200" : "border-black/5",
      ].join(" ")}
    >
      {/* Main row */}
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{enrollment.course_name}</span>
            <span className="font-mono text-xs text-slate-400">{enrollment.section_id}</span>
            {enrollment.status === "WAITLISTED" && (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                Waitlist
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {enrollment.instructor} · {enrollment.credits} cr
            {slots ? ` · ${slots}` : ""}
          </div>
          {enrollment.drop_blocked_reason && !isConfirming && (
            <div className="mt-1.5 text-xs text-amber-700">{enrollment.drop_blocked_reason}</div>
          )}
        </div>

        {!isConfirming && (
          <button
            type="button"
            onClick={onDrop}
            disabled={isLocked || isDropping || !enrollment.can_drop}
            className={[
              "shrink-0 inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold transition",
              enrollment.can_drop && !isLocked && !isDropping
                ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                : "border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed",
            ].join(" ")}
          >
            Drop
          </button>
        )}
      </div>

      {/* Inline confirmation — appears below the course info when triggered */}
      {isConfirming && (
        <div className="border-t border-red-100 bg-red-50 px-5 py-4">
          <p className="text-sm text-red-800">
            Are you sure you want to drop{" "}
            <span className="font-semibold">{enrollment.course_name}</span>? This cannot be undone.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDropping}
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition"
            >
              {isDropping ? "Dropping…" : "Confirm drop"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isDropping}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inline error — appears below the course info when this card errored */}
      {error && (
        <div className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}
