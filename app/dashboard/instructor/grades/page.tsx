"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { InstructorClassDTO, ClassRosterDTO, GradeSubmissionEntry } from "@/lib/instructor/types";

const VALID_GRADES = ["A", "B", "C", "D", "F"] as const;
type Grade = (typeof VALID_GRADES)[number];

type ToastKind = "success" | "error";
type Toast = { id: string; kind: ToastKind; title: string; message?: string };

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function GradeSubmissionPage() {
  const searchParams = useSearchParams();
  const preselectedClassId = searchParams.get("class") ?? "";

  const [classes, setClasses] = useState<InstructorClassDTO[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(preselectedClassId);
  const [roster, setRoster] = useState<ClassRosterDTO | null>(null);
  const [grades, setGrades] = useState<Record<string, Grade | "">>({});
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function pushToast(t: Omit<Toast, "id">) {
    const id = uid();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }

  // Load classes
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/instructor/classes", { cache: "no-store" });
        if (!alive) return;
        if (!res.ok) throw new Error(res.statusText);
        const data = (await res.json()) as InstructorClassDTO[];
        if (!alive) return;
        setClasses(data);
        if (!selectedClassId && data.length > 0) setSelectedClassId(data[0].class_id);
      } catch (err) {
        if (!alive) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load classes.");
      } finally {
        if (alive) setLoadingClasses(false);
      }
    })();
    return () => { alive = false; };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Load roster when class selection changes
  useEffect(() => {
    if (!selectedClassId) return;
    let alive = true;
    setRoster(null);
    setGrades({});
    setLoadingRoster(true);
    void (async () => {
      try {
        const res = await fetch(`/api/instructor/roster/${selectedClassId}`, { cache: "no-store" });
        if (!alive) return;
        if (!res.ok) throw new Error(res.statusText);
        const data = (await res.json()) as ClassRosterDTO;
        if (!alive) return;
        setRoster(data);
        // Pre-fill existing grades
        const initial: Record<string, Grade | ""> = {};
        for (const s of data.students) initial[s.enrollment_id] = (s.grade as Grade) ?? "";
        setGrades(initial);
      } catch (err) {
        if (!alive) return;
        pushToast({ kind: "error", title: "Failed to load roster", message: err instanceof Error ? err.message : undefined });
      } finally {
        if (alive) setLoadingRoster(false);
      }
    })();
    return () => { alive = false; };
  }, [selectedClassId]);

  const filledCount = useMemo(
    () => Object.values(grades).filter((g) => g !== "").length,
    [grades],
  );

  const totalStudents = roster?.students.length ?? 0;
  const allFilled = filledCount === totalStudents && totalStudents > 0;

  async function handleSubmit() {
    if (!selectedClassId || !roster) return;
    const entries: GradeSubmissionEntry[] = roster.students
      .filter((s) => grades[s.enrollment_id] !== "")
      .map((s) => ({ enrollment_id: s.enrollment_id, grade: grades[s.enrollment_id] as Grade }));

    if (entries.length === 0) {
      pushToast({ kind: "error", title: "No grades to submit", message: "Enter at least one grade." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/instructor/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: selectedClassId, grades: entries }),
      });
      const data = (await res.json()) as { status?: string; graded_count?: number; message?: string; error?: string };
      if (!res.ok) {
        pushToast({ kind: "error", title: data.error ?? "Submission failed", message: data.message });
        return;
      }
      pushToast({ kind: "success", title: "Grades submitted", message: data.message });
    } catch {
      pushToast({ kind: "error", title: "Network error", message: "Could not reach the server." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      {/* Toasts */}
      <div className="fixed top-5 right-5 z-60 flex flex-col gap-2 pointer-events-none">
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

      <DashboardShell
        main={
          <>
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
              <div className="text-sm font-semibold text-slate-900">Grade Submission</div>
              <Link
                href="/dashboard/instructor/classes"
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                ← Back to classes
              </Link>
            </div>

            {loadError && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
                {loadError}
              </div>
            )}

            {/* Class selector */}
            <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm p-6">
              <label className="text-xs font-semibold text-slate-700 block mb-2">
                Select Class
              </label>
              {loadingClasses ? (
                <div className="h-10 w-full rounded-xl bg-slate-100 animate-pulse" />
              ) : (
                <select
                  value={selectedClassId}
                  onChange={(e) => { const v = e.currentTarget.value; setSelectedClassId(v); }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50"
                >
                  <option value="">— choose a class —</option>
                  {classes.map((c) => (
                    <option key={c.class_id} value={c.class_id}>
                      {c.course_name} ({c.section_id}) · {c.semester} {c.year}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Grade table */}
            {selectedClassId && (
              <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-slate-900">
                    {loadingRoster ? "Loading roster…" : `Students (${filledCount}/${totalStudents} graded)`}
                  </div>
                  {!loadingRoster && totalStudents > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!roster) return;
                          const all: Record<string, Grade | ""> = {};
                          for (const s of roster.students) all[s.enrollment_id] = grades[s.enrollment_id] || "";
                          // fill all ungraded with empty — just reset unsaved changes
                          setGrades(all);
                        }}
                        className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>

                {loadingRoster ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : roster && roster.students.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-8 text-center text-slate-500 text-sm">
                    No students enrolled.
                  </div>
                ) : roster ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                            <th className="pb-3 pr-4 font-semibold">Student</th>
                            <th className="pb-3 pr-4 font-semibold hidden sm:table-cell">ID</th>
                            <th className="pb-3 font-semibold w-36">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {roster.students.map((s) => (
                            <tr key={s.enrollment_id} className="text-slate-700">
                              <td className="py-3 pr-4">
                                <div className="font-medium text-slate-900">{s.student_name}</div>
                                <div className="text-xs text-slate-400">{s.email}</div>
                              </td>
                              <td className="py-3 pr-4 text-xs font-mono text-slate-400 hidden sm:table-cell">
                                {s.student_id}
                              </td>
                              <td className="py-3">
                                <select
                                  value={grades[s.enrollment_id] ?? ""}
                                  onChange={(e) => {
                                    const v = e.currentTarget.value as Grade | "";
                                    setGrades((prev) => ({ ...prev, [s.enrollment_id]: v }));
                                  }}
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50"
                                >
                                  <option value="">—</option>
                                  {VALID_GRADES.map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
                      <div className="text-xs text-slate-500">
                        {allFilled
                          ? "All students graded — ready to submit."
                          : `${totalStudents - filledCount} student(s) without a grade.`}
                      </div>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || filledCount === 0}
                        className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(240,126,98,0.2)] hover:brightness-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {submitting ? "Submitting…" : `Submit ${filledCount} Grade${filledCount !== 1 ? "s" : ""}`}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </>
        }
      />
    </div>
  );
}
