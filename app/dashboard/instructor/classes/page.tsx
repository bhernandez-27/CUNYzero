import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getSession } from "@/lib/auth/session";
import type { InstructorClassDTO } from "@/lib/instructor/types";

export const metadata = { title: "My Classes — CUNYzero" };

function fmtSlots(slots: InstructorClassDTO["time_slots"]) {
  return slots.map((s) => `${s.day} ${s.start}–${s.end}`).join(" · ");
}

export default async function InstructorClassesPage() {
  const session = await getSession();
  if (!session) redirect("/auth");
  if (session.role !== "instructor") redirect("/dashboard");

  let classes: InstructorClassDTO[] = [];
  let loadError: string | null = null;

  try {
    const baseUrl = process.env.MAIN_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/instructor/classes`, { cache: "no-store" });
    if (!res.ok) throw new Error(res.statusText);
    classes = (await res.json()) as InstructorClassDTO[];
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load classes.";
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          <>
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">My Classes</div>
              <div className="text-xs text-slate-500">{classes.length} section{classes.length !== 1 ? "s" : ""} this semester</div>
            </div>

            {loadError && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
                {loadError}
              </div>
            )}

            {classes.length === 0 && !loadError ? (
              <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm p-10 text-center text-slate-500 text-sm">
                No classes assigned for this semester.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {classes.map((c) => (
                  <div
                    key={c.class_id}
                    className="rounded-2xl bg-white border border-black/5 shadow-sm p-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900">{c.course_name}</span>
                          <span className="text-xs text-slate-500">({c.course_code})</span>
                          <span
                            className={[
                              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold",
                              c.status === "ACTIVE"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-red-200 bg-red-50 text-red-800",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "h-1.5 w-1.5 rounded-full",
                                c.status === "ACTIVE" ? "bg-emerald-500" : "bg-red-500",
                              ].join(" ")}
                            />
                            {c.status}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {c.section_id} · {c.semester} {c.year}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{fmtSlots(c.time_slots)}</div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-slate-900">
                            {c.enrolled}
                            <span className="text-slate-400">/{c.capacity}</span>
                          </div>
                          <div className="text-xs text-slate-500">enrolled</div>
                        </div>
                        {c.waitlisted > 0 && (
                          <div className="text-right">
                            <div className="text-sm font-semibold text-amber-700">{c.waitlisted}</div>
                            <div className="text-xs text-slate-500">waitlisted</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Enrollment bar */}
                    <div className="mt-4 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#F07E62] transition-all"
                        style={{ width: `${Math.min(100, (c.enrolled / c.capacity) * 100)}%` }}
                      />
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <Link
                        href={`/dashboard/instructor/classes/${c.class_id}`}
                        className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
                      >
                        View Roster
                      </Link>
                      {c.waitlisted > 0 && (
                        <Link
                          href={`/dashboard/instructor/waitlist?class=${c.class_id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
                        >
                          Waitlist ({c.waitlisted})
                        </Link>
                      )}
                      <Link
                        href={`/dashboard/instructor/grades?class=${c.class_id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                      >
                        Submit Grades
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        }
      />
    </div>
  );
}
