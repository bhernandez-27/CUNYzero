import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getSession } from "@/lib/auth/session";
import type { StudentClassDTO } from "@/app/api/student/classes/route";

const CARD_COLORS = [
  "bg-gradient-to-br from-neutral-900 to-neutral-800",
  "bg-gradient-to-br from-[#F07E62] to-[#E86B4F]",
  "bg-gradient-to-br from-neutral-900 to-[#F07E62]",
  "bg-gradient-to-br from-slate-700 to-slate-900",
];

function numericToLetter(g: number | null): string | null {
  if (g == null) return null;
  if (g >= 4.0) return "A";
  if (g >= 3.0) return "B";
  if (g >= 2.0) return "C";
  if (g >= 1.0) return "D";
  return "F";
}

function fmtSlots(slots: StudentClassDTO["time_slots"]) {
  if (!slots.length) return "Schedule TBA";
  return slots.map((s) => `${s.day} ${s.start}–${s.end}`).join(" · ");
}

export default async function MyClassesPage() {
  const session = await getSession();
  if (!session) redirect("/auth");
  if (session.role !== "student") redirect("/dashboard");

  const baseUrl = process.env.MAIN_URL ?? "http://localhost:3000";
  let classes: StudentClassDTO[] = [];

  try {
    const res = await fetch(`${baseUrl}/api/student/classes`, { cache: "no-store" });
    if (res.ok) classes = (await res.json()) as StudentClassDTO[];
  } catch {
    // leave classes as empty; handled below
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          <>
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">My Classes</div>
                <div className="mt-1 text-sm text-slate-600">
                  {classes.length
                    ? `You are enrolled in ${classes.length} class${classes.length !== 1 ? "es" : ""} this semester.`
                    : "You are not currently enrolled in any classes."}
                </div>
              </div>
              <Link
                href="/dashboard/registration"
                className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition"
              >
                Register for classes
              </Link>
            </div>

            {classes.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm p-12 text-center">
                <div className="text-slate-400 text-4xl mb-4">📚</div>
                <div className="text-sm font-semibold text-slate-900">No classes yet</div>
                <div className="mt-1 text-sm text-slate-500">
                  Head to Registration to enroll in your courses for this semester.
                </div>
                <Link
                  href="/dashboard/registration"
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97] transition"
                >
                  Go to Registration
                </Link>
              </div>
            ) : (
              <>
                {/* Class cards */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.map((c, i) => {
                    const letter = numericToLetter(c.number_grade);
                    return (
                      <Link
                        key={c.class_id}
                        href={`/dashboard/class/${c.class_id}`}
                        className={[
                          "rounded-2xl p-5 text-white shadow-sm transition hover:-translate-y-0.5",
                          CARD_COLORS[i % CARD_COLORS.length],
                        ].join(" ")}
                      >
                        {/* Status pill */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                            {c.enrollment_status}
                          </span>
                          {letter ? (
                            <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
                              Grade: {letter}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
                              In progress
                            </span>
                          )}
                        </div>

                        {/* Course name */}
                        <div className="mt-3 text-base font-semibold leading-snug">
                          {c.course_name}{" "}
                          <span className="text-white/70 text-sm">({c.course_code})</span>
                        </div>

                        {/* Schedule */}
                        <div className="mt-2 text-xs text-white/70">{fmtSlots(c.time_slots)}</div>

                        {/* Footer */}
                        <div className="mt-4 flex items-center justify-between text-xs text-white/70">
                          <span>{c.instructor ?? "Staff"}</span>
                          <div className="flex items-center gap-3">
                            <span>{c.credits} cr</span>
                            {c.average_rating != null && (
                              <span>★ {c.average_rating.toFixed(1)}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Detail table */}
                <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-black/5 text-sm font-semibold text-slate-900">
                    Enrollment details
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500">
                          <th className="py-3 px-5 font-semibold">Course</th>
                          <th className="py-3 px-5 font-semibold">Instructor</th>
                          <th className="py-3 px-5 font-semibold">Schedule</th>
                          <th className="py-3 px-5 font-semibold">Credits</th>
                          <th className="py-3 px-5 font-semibold">Status</th>
                          <th className="py-3 px-5 font-semibold">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classes.map((c) => {
                          const letter = numericToLetter(c.number_grade);
                          return (
                            <tr key={c.class_id} className="text-slate-700 hover:bg-slate-50 transition">
                              <td className="py-3 px-5">
                                <Link
                                  href={`/dashboard/class/${c.class_id}`}
                                  className="font-semibold text-slate-900 hover:text-[#F07E62] transition"
                                >
                                  {c.course_name}
                                </Link>
                                <div className="text-xs text-slate-500 mt-0.5">Code {c.course_code}</div>
                              </td>
                              <td className="py-3 px-5 text-slate-600">{c.instructor ?? "Staff"}</td>
                              <td className="py-3 px-5 text-slate-600 text-xs">{fmtSlots(c.time_slots)}</td>
                              <td className="py-3 px-5">{c.credits}</td>
                              <td className="py-3 px-5">
                                <span
                                  className={[
                                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border",
                                    c.enrollment_status === "ENROLLED"
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      : c.enrollment_status === "WAITLISTED"
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : "bg-slate-50 text-slate-700 border-slate-200",
                                  ].join(" ")}
                                >
                                  <span
                                    className={[
                                      "h-1.5 w-1.5 rounded-full",
                                      c.enrollment_status === "ENROLLED"
                                        ? "bg-emerald-500"
                                        : c.enrollment_status === "WAITLISTED"
                                          ? "bg-amber-500"
                                          : "bg-slate-400",
                                    ].join(" ")}
                                  />
                                  {c.enrollment_status}
                                </span>
                              </td>
                              <td className="py-3 px-5">
                                {letter ? (
                                  <span
                                    className={[
                                      "inline-flex items-center justify-center h-7 w-7 rounded-lg text-xs font-bold",
                                      letter === "A" ? "bg-emerald-100 text-emerald-800" :
                                      letter === "B" ? "bg-sky-100 text-sky-800" :
                                      letter === "C" ? "bg-amber-100 text-amber-800" :
                                      letter === "D" ? "bg-orange-100 text-orange-800" :
                                      "bg-red-100 text-red-800",
                                    ].join(" ")}
                                  >
                                    {letter}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">Pending</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        }
      />
    </div>
  );
}
