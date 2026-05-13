"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { SemesterDTO, SemesterPeriod, CancelledClassInfo } from "@/app/api/registrar/semester/route";
import { PERIOD_ORDER } from "@/app/api/registrar/semester/route";

type PageState = "loading" | "error" | "ready" | "confirming" | "advancing" | "advanced";

// What is currently active / locked in each period
const PERIOD_INFO: Record<
  SemesterPeriod,
  {
    label: string;
    color: string;
    badgeStyle: string;
    summary: string;
    active: string[];
    locked: string[];
    advanceLabel: string;
    advanceTo: string;
    advanceWarning: string;
    consequences: string[];
  }
> = {
  CLASS_SETUP: {
    label: "Class Set-Up",
    color: "text-blue-700",
    badgeStyle: "border-blue-200 bg-blue-50 text-blue-700",
    summary:
      "You are building the course catalog for the upcoming semester. No students can register yet.",
    active: [
      "Create and edit class sections",
      "Assign instructors to classes",
      "Set meeting times and enrollment capacities",
    ],
    locked: [
      "Student course registration (not open yet)",
      "Grade submission (not open yet)",
    ],
    advanceLabel: "Open Course Registration",
    advanceTo: "Course Registration",
    advanceWarning:
      "Students will be able to see all classes and register for up to 4 courses. Make sure all classes are fully set up before continuing.",
    consequences: [
      "All class sections become visible to students",
      "Students can register for 2–4 courses",
      "Waitlists activate for full sections",
      "You can no longer add or remove classes",
    ],
  },
  REGISTRATION: {
    label: "Course Registration",
    color: "text-violet-700",
    badgeStyle: "border-violet-200 bg-violet-50 text-violet-700",
    summary:
      "Students are actively registering for classes. Monitor enrollment numbers before starting the semester.",
    active: [
      "Students register for courses (2–4 per student)",
      "Waitlists are open for full sections",
      "You can monitor enrollment counts per section",
    ],
    locked: [
      "Class creation and editing (catalog is frozen)",
      "Grade submission (not open yet)",
    ],
    advanceLabel: "Start the Semester",
    advanceTo: "Class Running",
    advanceWarning:
      "This officially starts the semester. Under-enrolled sections will be automatically cancelled and affected students will be notified.",
    consequences: [
      "Sections with fewer than 3 enrolled students are automatically cancelled",
      "Cancelled-course students receive a one-time re-registration window",
      "Students still in fewer than 2 courses after re-registration get a warning",
      "Instructors whose all courses were cancelled are suspended for next semester",
      "Course registration locks for everyone else",
      "Course reviews and AI Q&A become available to students",
    ],
  },
  CLASS_RUNNING: {
    label: "Class Running",
    color: "text-emerald-700",
    badgeStyle: "border-emerald-200 bg-emerald-50 text-emerald-700",
    summary:
      "The semester is in progress. Classes are being held and students can submit reviews.",
    active: [
      "Students attend classes and submit course reviews",
      "AI Q&A is available to students and instructors",
      "You can process complaints and grade audits",
    ],
    locked: [
      "Course registration (locked for all students)",
      "Grade submission (opens in Grading period)",
    ],
    advanceLabel: "Open Grading",
    advanceTo: "Grading",
    advanceWarning:
      "Instructors will be able to submit final grades. The semester is nearly over.",
    consequences: [
      "Instructors can now submit final grades for all enrolled students",
      "GPAs are recalculated automatically as grades are posted",
      "Honor roll, warnings, and suspensions are applied automatically",
      "Class GPAs outside 2.5–3.5 are flagged for your review",
      "Graduation applications can be processed",
    ],
  },
  GRADING: {
    label: "Grading",
    color: "text-amber-700",
    badgeStyle: "border-amber-200 bg-amber-50 text-amber-700",
    summary:
      "Instructors are submitting final grades. GPAs and academic standing are being updated automatically.",
    active: [
      "Instructors submit final grades",
      "GPA recalculations and academic standing updates run automatically",
      "Graduation applications can be reviewed and approved",
      "Class GPAs outside 2.5–3.5 are flagged in Grade Audit",
    ],
    locked: [
      "Course registration (semester has ended)",
      "Course reviews (grading period has started)",
    ],
    advanceLabel: "End Semester & Begin New Set-Up",
    advanceTo: "Class Set-Up",
    advanceWarning:
      "This ends the current semester entirely and begins a new Class Set-Up period for the next semester.",
    consequences: [
      "Current semester is closed",
      "All final academic actions (suspensions, terminations, honor roll) are finalized",
      "A new Class Set-Up period begins for the next semester",
      "Instructors who did not submit all grades receive a warning",
    ],
  },
};

export default function SemesterPage() {
  const [semester, setSemester] = useState<SemesterDTO | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [cancelledClasses, setCancelledClasses] = useState<CancelledClassInfo[]>([]);
  const [warningsIssued, setWarningsIssued] = useState(0);
  const [instructorsSuspended, setInstructorsSuspended] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/registrar/semester", { cache: "no-store" });
        if (!res.ok) throw new Error();
        setSemester((await res.json()) as SemesterDTO);
        setPageState("ready");
      } catch {
        setLoadError("Could not load semester information. Try again later.");
        setPageState("error");
      }
    })();
  }, []);

  async function handleAdvance() {
    setPageState("advancing");
    setAdvanceError(null);
    try {
      const res = await fetch("/api/registrar/semester", {
        method: "POST",
        credentials: "include",
      });
      const payload = (await res.json()) as SemesterDTO & { message?: string };
      if (!res.ok) {
        setAdvanceError((payload as unknown as { message?: string }).message ?? "Failed to advance period.");
        setPageState("ready");
        return;
      }
      setSemester(payload);
      setCancelledClasses(payload.cancelled_classes ?? []);
      setWarningsIssued(payload.warnings_issued ?? 0);
      setInstructorsSuspended(payload.instructors_suspended ?? 0);
      setPageState("advanced");
    } catch {
      setAdvanceError("Network error. Check your connection and try again.");
      setPageState("ready");
    }
  }

  const currentIndex = semester ? PERIOD_ORDER.indexOf(semester.period) : -1;
  const nextPeriod =
    currentIndex >= 0 && currentIndex < PERIOD_ORDER.length - 1
      ? PERIOD_ORDER[currentIndex + 1]
      : null;
  const info = semester ? PERIOD_INFO[semester.period] : null;
  const nextInfo = nextPeriod ? PERIOD_INFO[nextPeriod] : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          <div className="max-w-2xl">
            <div className="text-lg font-semibold text-slate-900">Academic Calendar</div>
            <div className="mt-1 text-sm text-slate-500">
              You control the semester lifecycle. Advancing moves the entire college to the next
              phase and triggers automated system actions.
            </div>

            {pageState === "loading" && (
              <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-sm text-slate-500">
                Loading semester status…
              </div>
            )}
            {pageState === "error" && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
                {loadError}
              </div>
            )}

            {semester && info && (pageState === "ready" || pageState === "confirming" || pageState === "advancing" || pageState === "advanced") && (
              <div className="mt-6 space-y-4">

                {/* Timeline */}
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                    {semester.semester} {semester.year} — Semester Progress
                  </div>
                  <div className="space-y-2">
                    {PERIOD_ORDER.map((p, idx) => {
                      const isCurrent = p === semester.period;
                      const isDone = idx < currentIndex;
                      const isUpcoming = idx > currentIndex;
                      const pInfo = PERIOD_INFO[p];
                      return (
                        <div key={p} className="flex items-center gap-3">
                          <div
                            className={[
                              "h-7 w-7 rounded-full border-2 grid place-items-center shrink-0 text-xs font-bold",
                              isCurrent
                                ? "border-[#F07E62] bg-[#F07E62] text-white"
                                : isDone
                                  ? "border-emerald-400 bg-emerald-400 text-white"
                                  : "border-slate-200 bg-white text-slate-300",
                            ].join(" ")}
                          >
                            {isDone ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : (
                              idx + 1
                            )}
                          </div>
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <span
                              className={[
                                "text-sm font-semibold",
                                isCurrent ? "text-slate-900" : isDone ? "text-slate-400 line-through" : "text-slate-300",
                              ].join(" ")}
                            >
                              {pInfo.label}
                            </span>
                            {isCurrent && (
                              <span className={["text-[10px] font-semibold rounded-full border px-2 py-0.5", pInfo.badgeStyle].join(" ")}>
                                Current
                              </span>
                            )}
                            {isUpcoming && (
                              <span className="text-[10px] text-slate-300 font-medium">Upcoming</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* What's happening now */}
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4 space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      What's happening right now
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">{info.summary}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-1.5">
                        ✓ Active
                      </div>
                      <ul className="space-y-1">
                        {info.active.map((item) => (
                          <li key={item} className="flex items-start gap-1.5 text-xs text-slate-600">
                            <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                        ✗ Locked
                      </div>
                      <ul className="space-y-1">
                        {info.locked.map((item) => (
                          <li key={item} className="flex items-start gap-1.5 text-xs text-slate-400">
                            <span className="mt-0.5 shrink-0">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    Since {new Date(semester.advanced_at).toLocaleDateString("en-US", { dateStyle: "long" })}
                  </div>
                </div>

                {/* Success banner */}
                {pageState === "advanced" && (
                  <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-emerald-50 border border-emerald-200 grid place-items-center shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Semester advanced</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          The college is now in <span className="font-medium">{info.label}</span>. All automated actions have been triggered.
                        </div>
                      </div>
                    </div>

                    {/* Automation report — only shown when advancing to CLASS_RUNNING */}
                    {semester?.period === "CLASS_RUNNING" && (
                      <div className="border-t border-slate-100 pt-3 space-y-2">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Automated actions
                        </div>

                        {cancelledClasses.length === 0 ? (
                          <div className="text-xs text-slate-500">
                            No classes were under-enrolled — all sections are running.
                          </div>
                        ) : (
                          <>
                            <div className="text-xs text-slate-700">
                              <span className="font-semibold text-red-700">{cancelledClasses.length} class{cancelledClasses.length !== 1 ? "es" : ""} cancelled</span>
                              {" "}due to fewer than 3 enrolled students:
                            </div>
                            <ul className="space-y-1">
                              {cancelledClasses.map((c) => (
                                <li key={c.class_id} className="flex items-center gap-2 text-xs text-slate-600">
                                  <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2 py-0.5 font-semibold text-[10px]">
                                    CANCELLED
                                  </span>
                                  {c.course_name}
                                  <span className="text-slate-400">({c.enrolled} enrolled)</span>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}

                        {warningsIssued > 0 && (
                          <div className="text-xs text-amber-700">
                            {warningsIssued} student{warningsIssued !== 1 ? "s" : ""} warned for having fewer than 2 courses after cancellations.
                          </div>
                        )}
                        {instructorsSuspended > 0 && (
                          <div className="text-xs text-red-700">
                            {instructorsSuspended} instructor{instructorsSuspended !== 1 ? "s" : ""} suspended — all their classes were cancelled.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* What will happen when you advance */}
                {pageState === "ready" && nextPeriod && nextInfo && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Next — {nextInfo.label}
                      </div>
                      <div className="mt-1 text-sm text-slate-700">{info.advanceWarning}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                        What happens automatically
                      </div>
                      <ul className="space-y-1">
                        {info.consequences.map((c) => (
                          <li key={c} className="flex items-start gap-1.5 text-xs text-slate-600">
                            <span className="text-[#F07E62] mt-0.5 shrink-0">→</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPageState("confirming")}
                      className="mt-1 inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97] transition"
                    >
                      {info.advanceLabel} →
                    </button>
                  </div>
                )}

                {/* Confirm dialog */}
                {pageState === "confirming" && nextInfo && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
                    <div className="text-sm font-semibold text-amber-900">
                      Are you sure you want to advance to {nextInfo.label}?
                    </div>
                    <p className="text-sm text-amber-800">
                      This cannot be undone. All automated actions listed above will run immediately.
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => void handleAdvance()}
                        className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.35)] hover:brightness-[0.97] transition"
                      >
                        Yes, advance now
                      </button>
                      <button
                        type="button"
                        onClick={() => setPageState("ready")}
                        className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {pageState === "advancing" && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
                    Advancing semester…
                  </div>
                )}

                {advanceError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
                    {advanceError}
                  </div>
                )}

                {!nextPeriod && pageState === "ready" && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    This is the final period of the semester. Once all grades are submitted and
                    graduation applications are processed, advance to begin the next semester's
                    Class Set-Up.
                  </div>
                )}
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}
