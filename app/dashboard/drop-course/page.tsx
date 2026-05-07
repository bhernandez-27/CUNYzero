"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { EnrolledCourseDTO } from "@/app/api/registration/drop/route";

type DropState = "idle" | "confirming" | "dropping" | "dropped" | "error";

export default function DropCoursePage() {
  const [enrollments, setEnrollments] = useState<EnrolledCourseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<EnrolledCourseDTO | null>(null);
  const [dropState, setDropState] = useState<DropState>("idle");
  const [dropError, setDropError] = useState<string | null>(null);
  const [droppedId, setDroppedId] = useState<string | null>(null);

  useEffect(() => {
    void loadEnrollments();
  }, []);

  async function loadEnrollments() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/registration/drop", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load enrollments");
      setEnrollments((await res.json()) as EnrolledCourseDTO[]);
    } catch {
      setLoadError("Could not load your current enrollments. Try again later.");
    } finally {
      setLoading(false);
    }
  }

  function handleDropClick(enrollment: EnrolledCourseDTO) {
    setSelected(enrollment);
    setDropState("confirming");
    setDropError(null);
  }

  function handleCancel() {
    setSelected(null);
    setDropState("idle");
    setDropError(null);
  }

  async function handleConfirmDrop() {
    if (!selected) return;
    setDropState("dropping");
    setDropError(null);

    try {
      const res = await fetch("/api/registration/drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enrollment_id: selected.enrollment_id }),
      });

      const data = (await res.json()) as { status?: string; message?: string; error?: string };

      if (!res.ok) {
        setDropError(data.message ?? "Drop request failed. Please try again.");
        setDropState("error");
        return;
      }

      setDroppedId(selected.enrollment_id);
      setEnrollments((prev) => prev.filter((e) => e.enrollment_id !== selected.enrollment_id));
      setSelected(null);
      setDropState("dropped");
    } catch {
      setDropError("Network error. Check your connection and try again.");
      setDropState("error");
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

            {/* Confirmation panel */}
            {dropState === "confirming" && selected && (
              <ConfirmPanel
                course={selected}
                onConfirm={handleConfirmDrop}
                onCancel={handleCancel}
              />
            )}

            {dropState === "dropping" && selected && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm text-slate-600">
                Dropping <span className="font-semibold">{selected.course_name}</span>…
              </div>
            )}

            {dropState === "error" && dropError && (
              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
                  {dropError}
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Back to enrollments
                </button>
              </div>
            )}

            {dropState === "dropped" && (
              <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-200 grid place-items-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Course dropped</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Your schedule has been updated.
                      {waitlistEnrollments.length > 0 ? " A waitlisted student may be promoted." : ""}
                    </div>
                  </div>
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
                            onDrop={handleDropClick}
                            disabled={
                              dropState === "confirming" ||
                              dropState === "dropping" ||
                              (droppedId === e.enrollment_id)
                            }
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
                            onDrop={handleDropClick}
                            disabled={
                              dropState === "confirming" ||
                              dropState === "dropping"
                            }
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
  onDrop,
  disabled,
}: {
  enrollment: EnrolledCourseDTO;
  onDrop: (e: EnrolledCourseDTO) => void;
  disabled: boolean;
}) {
  const slots = enrollment.time_slots
    .map((t) => `${t.day} ${t.start}–${t.end}`)
    .join(", ");

  return (
    <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4 flex items-start justify-between gap-4">
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
        {enrollment.drop_blocked_reason && (
          <div className="mt-1.5 text-xs text-amber-700">{enrollment.drop_blocked_reason}</div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDrop(enrollment)}
        disabled={disabled || !enrollment.can_drop}
        className={[
          "shrink-0 inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold transition",
          enrollment.can_drop && !disabled
            ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            : "border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed",
        ].join(" ")}
      >
        Drop
      </button>
    </div>
  );
}

function ConfirmPanel({
  course,
  onConfirm,
  onCancel,
}: {
  course: EnrolledCourseDTO;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 space-y-3">
      <div className="text-sm font-semibold text-red-900">Confirm drop — are you sure?</div>
      <p className="text-sm text-red-800">
        You are about to drop{" "}
        <span className="font-semibold">{course.course_name}</span> ({course.section_id}). This
        action cannot be undone. If a student is waitlisted, they will be promoted automatically.
      </p>
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
        >
          Yes, drop course
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
