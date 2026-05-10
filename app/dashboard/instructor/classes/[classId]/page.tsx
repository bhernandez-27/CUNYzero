import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getSession } from "@/lib/auth/session";
import type { ClassRosterDTO } from "@/lib/instructor/types";

export const metadata = { title: "Class Roster — CUNYzero" };

const GRADE_COLORS: Record<string, string> = {
  A: "border-emerald-200 bg-emerald-50 text-emerald-800",
  B: "border-sky-200 bg-sky-50 text-sky-800",
  C: "border-amber-200 bg-amber-50 text-amber-800",
  D: "border-orange-200 bg-orange-50 text-orange-800",
  F: "border-red-200 bg-red-50 text-red-800",
};

function fmtSlots(slots: ClassRosterDTO["time_slots"]) {
  return slots.map((s) => `${s.day} ${s.start}–${s.end}`).join(" · ");
}

export default async function ClassRosterPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const session = await getSession();
  if (!session) redirect("/auth");
  if (session.role !== "instructor") redirect("/dashboard");

  let roster: ClassRosterDTO | null = null;
  let loadError: string | null = null;

  try {
    const baseUrl = process.env.MAIN_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/instructor/roster/${classId}`, { cache: "no-store" });
    if (res.status === 404) notFound();
    if (!res.ok) throw new Error(res.statusText);
    roster = (await res.json()) as ClassRosterDTO;
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load roster.";
  }

  const gradedCount = roster?.students.filter((s) => s.grade !== null).length ?? 0;
  const totalStudents = roster?.students.length ?? 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          <>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
              <Link href="/dashboard/instructor/classes" className="hover:text-slate-900">
                My Classes
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-medium">{roster?.section_id ?? classId}</span>
            </div>

            {/* Header */}
            {roster && (
              <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{roster.course_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {roster.section_id} · {roster.semester} {roster.year} · {fmtSlots(roster.time_slots)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">{gradedCount}/{totalStudents}</div>
                    <div className="text-xs text-slate-500">graded</div>
                  </div>
                  <Link
                    href={`/dashboard/instructor/grades?class=${classId}`}
                    className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_16px_rgba(240,126,98,0.2)] hover:brightness-95 transition"
                  >
                    Submit Grades
                  </Link>
                </div>
              </div>
            )}

            {loadError && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
                {loadError}
              </div>
            )}

            {/* Roster table */}
            {roster && (
              <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm p-6">
                <div className="text-sm font-semibold text-slate-900 mb-4">
                  Enrolled Students ({totalStudents})
                </div>

                {totalStudents === 0 ? (
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-10 text-center text-slate-500 text-sm">
                    No students enrolled.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                          <th className="pb-3 pr-4 font-semibold">Student</th>
                          <th className="pb-3 pr-4 font-semibold">Email</th>
                          <th className="pb-3 pr-4 font-semibold">ID</th>
                          <th className="pb-3 font-semibold">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {roster.students.map((s) => (
                          <tr key={s.enrollment_id} className="text-slate-700">
                            <td className="py-3 pr-4 font-medium text-slate-900">{s.student_name}</td>
                            <td className="py-3 pr-4 text-slate-500">{s.email}</td>
                            <td className="py-3 pr-4 text-slate-400 text-xs font-mono">{s.student_id}</td>
                            <td className="py-3">
                              {s.grade ? (
                                <span
                                  className={[
                                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                                    GRADE_COLORS[s.grade] ?? "border-slate-200 bg-slate-50 text-slate-800",
                                  ].join(" ")}
                                >
                                  {s.grade}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Pending</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        }
      />
    </div>
  );
}
