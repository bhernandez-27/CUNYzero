"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { StudentGradesDTO, SemesterRecord, CourseGrade } from "@/lib/grades/types";

export default function GradesPage() {
  const [data, setData] = useState<StudentGradesDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/grades/student", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load grades");
        setData((await res.json()) as StudentGradesDTO);
      } catch {
        setError("Could not load your grades. Try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          loading ? (
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-sm text-slate-500">
              Loading grades…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
              {error}
            </div>
          ) : data ? (
            <GradesView data={data} />
          ) : null
        }
      />
    </div>
  );
}

function GradesView({ data }: { data: StudentGradesDTO }) {
  const gpa = data.cumulative_gpa;
  const standing = academicStanding(gpa, data.honor_roll);

  return (
    <>
      <div className="text-lg font-semibold text-slate-900">Grades & GPA</div>
      <div className="mt-1 text-sm text-slate-500">
        {data.courses_completed} course{data.courses_completed !== 1 ? "s" : ""} completed
      </div>

      {/* Academic standing banner */}
      {standing.banner ? (
        <div className={["mt-4 rounded-2xl border px-5 py-4 text-sm", standing.bannerStyle].join(" ")}>
          <span className="font-semibold">{standing.banner.title}</span>{" "}
          {standing.banner.body}
        </div>
      ) : null}

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Cumulative GPA"
          value={gpa != null ? gpa.toFixed(2) : "—"}
          sub="4.0 scale"
          accent={gpaColor(gpa)}
        />
        <StatCard
          label="Last Semester GPA"
          value={lastSemesterGpa(data.semesters)}
          sub="4.0 scale"
        />
        <StatCard
          label="Courses Completed"
          value={String(data.courses_completed)}
          sub={`of 8 required`}
        />
        <StatCard
          label="Warnings"
          value={String(data.warning_count)}
          sub="3 = suspension"
          accent={data.warning_count >= 2 ? "text-red-600" : data.warning_count === 1 ? "text-amber-600" : undefined}
        />
      </div>

      {/* Academic standing + honor roll badges */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className={["inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold", standing.badgeStyle].join(" ")}>
          <span className={["h-2 w-2 rounded-full", standing.dot].join(" ")} />
          {standing.label}
        </span>
        {data.honor_roll ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-800">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            Honor Roll
          </span>
        ) : null}
        {data.warning_count > 0 ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {data.warning_count} Warning{data.warning_count !== 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      {/* Semester sections */}
      <div className="mt-6 space-y-5">
        {data.semesters.length === 0 ? (
          <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-center text-sm text-slate-500">
            No grade records yet. Grades will appear here after each semester.
          </div>
        ) : (
          data.semesters.map((sem) => (
            <SemesterSection key={`${sem.semester}-${sem.year}`} sem={sem} />
          ))
        )}
      </div>
    </>
  );
}

function SemesterSection({ sem }: { sem: SemesterRecord }) {
  const hasGrades = sem.courses.some((c) => c.grade !== null);

  return (
    <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between gap-4">
        <div className="text-sm font-semibold text-slate-900">
          {sem.semester} {sem.year}
        </div>
        <div className="text-sm text-slate-500">
          {sem.semester_gpa != null ? (
            <span>
              Semester GPA:{" "}
              <span className={["font-semibold", gpaColor(sem.semester_gpa)].join(" ")}>
                {sem.semester_gpa.toFixed(2)}
              </span>
            </span>
          ) : (
            <span className="text-slate-400 italic">Grades not yet posted</span>
          )}
        </div>
      </div>

      {/* Course rows */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-black/5">
              <th className="py-3 px-5 font-semibold">Course</th>
              <th className="py-3 px-5 font-semibold">Instructor</th>
              <th className="py-3 px-5 font-semibold text-center">Credits</th>
              <th className="py-3 px-5 font-semibold text-center">Grade</th>
              <th className="py-3 px-5 font-semibold text-center">Grade Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sem.courses.map((c) => (
              <CourseRow key={c.section_id} course={c} />
            ))}
          </tbody>
          {hasGrades ? (
            <tfoot>
              <tr className="border-t border-black/5 bg-slate-50">
                <td colSpan={2} className="py-3 px-5 text-xs font-semibold text-slate-500">
                  Weighted total
                </td>
                <td className="py-3 px-5 text-center text-xs font-semibold text-slate-700">
                  {sem.courses.filter((c) => c.grade !== null).reduce((s, c) => s + c.credits, 0)} cr
                </td>
                <td />
                <td className="py-3 px-5 text-center text-xs font-semibold text-slate-700">
                  {sem.semester_gpa?.toFixed(2) ?? "—"}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}

function CourseRow({ course }: { course: CourseGrade }) {
  const pending = course.grade === null;

  return (
    <tr className="text-slate-700">
      <td className="py-3 px-5">
        <div className="font-semibold text-slate-900">{course.course_name}</div>
        <div className="mt-0.5 font-mono text-xs text-slate-500">{course.section_id}</div>
      </td>
      <td className="py-3 px-5 text-slate-600">{course.instructor}</td>
      <td className="py-3 px-5 text-center text-slate-700">{course.credits}</td>
      <td className="py-3 px-5 text-center">
        {pending ? (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
            Pending
          </span>
        ) : (
          <span className={["inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", gradePillStyle(course.grade!)].join(" ")}>
            {course.grade}
          </span>
        )}
      </td>
      <td className="py-3 px-5 text-center text-slate-700">
        {course.grade_points != null ? course.grade_points.toFixed(1) : "—"}
      </td>
    </tr>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={["mt-1 text-2xl font-bold", accent ?? "text-slate-900"].join(" ")}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-slate-400">{sub}</div>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function lastSemesterGpa(semesters: SemesterRecord[]): string {
  const withGrades = semesters.filter((s) => s.semester_gpa != null);
  if (!withGrades.length) return "—";
  return withGrades[0]!.semester_gpa!.toFixed(2);
}

function gpaColor(gpa: number | null): string {
  if (gpa == null) return "text-slate-900";
  if (gpa >= 3.5) return "text-emerald-600";
  if (gpa >= 2.25) return "text-slate-900";
  if (gpa >= 2.0) return "text-amber-600";
  return "text-red-600";
}

function gradePillStyle(grade: string): string {
  switch (grade) {
    case "A": return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "B": return "border-blue-200 bg-blue-50 text-blue-800";
    case "C": return "border-amber-200 bg-amber-50 text-amber-800";
    case "D": return "border-orange-200 bg-orange-50 text-orange-800";
    case "F": return "border-red-200 bg-red-50 text-red-800";
    default:  return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

type Standing = {
  label: string;
  badgeStyle: string;
  dot: string;
  banner: { title: string; body: string } | null;
  bannerStyle: string;
};

function academicStanding(gpa: number | null, honorRoll: boolean): Standing {
  if (honorRoll || (gpa != null && gpa >= 3.5)) {
    return {
      label: "Good Standing",
      badgeStyle: "border-emerald-200 bg-emerald-50 text-emerald-800",
      dot: "bg-emerald-500",
      banner: null,
      bannerStyle: "",
    };
  }
  if (gpa != null && gpa >= 2.25) {
    return {
      label: "Good Standing",
      badgeStyle: "border-emerald-200 bg-emerald-50 text-emerald-800",
      dot: "bg-emerald-500",
      banner: null,
      bannerStyle: "",
    };
  }
  if (gpa != null && gpa >= 2.0) {
    return {
      label: "Academic Warning",
      badgeStyle: "border-amber-200 bg-amber-50 text-amber-800",
      dot: "bg-amber-500",
      banner: {
        title: "Academic Warning.",
        body: "Your GPA is between 2.0 and 2.25. You have been flagged for a mandatory interview with the Registrar.",
      },
      bannerStyle: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }
  if (gpa != null && gpa < 2.0) {
    return {
      label: "At Risk",
      badgeStyle: "border-red-200 bg-red-50 text-red-800",
      dot: "bg-red-500",
      banner: {
        title: "Academic Standing: At Risk.",
        body: "Your cumulative GPA is below 2.0. Per college policy, continued enrollment is subject to Registrar review.",
      },
      bannerStyle: "border-red-200 bg-red-50 text-red-900",
    };
  }
  return {
    label: "Good Standing",
    badgeStyle: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
    banner: null,
    bannerStyle: "",
  };
}
