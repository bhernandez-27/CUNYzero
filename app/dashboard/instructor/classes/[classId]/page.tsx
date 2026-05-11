import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getSession } from "@/lib/auth/session";
import type { ClassRosterDTO } from "@/lib/instructor/types";
import RosterClientTable from "@/components/instructor/RosterClientTable";

export const metadata = { title: "Class Roster — CUNYzero" };


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

            {roster && <RosterClientTable roster={roster} />}
          </>
        }
      />
    </div>
  );
}
