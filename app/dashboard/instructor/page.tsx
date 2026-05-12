import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getSession } from "@/lib/auth/session";
import type { InstructorClassDTO } from "@/lib/instructor/types";

export const metadata = { title: "Instructor Dashboard — CUNYzero" };

const GRAD: string[] = [
  "bg-gradient-to-br from-neutral-900 to-neutral-800",
  "bg-gradient-to-br from-[#F07E62] to-[#E86B4F]",
  "bg-gradient-to-br from-neutral-900 to-[#F07E62]",
];

function fmtSlots(slots: InstructorClassDTO["time_slots"]) {
  return slots.map((s) => `${s.day} ${s.start}–${s.end}`).join(" · ");
}

export default async function InstructorDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/auth");
  if (session.role !== "instructor") redirect("/dashboard");

  let classes: InstructorClassDTO[] = [];
  let loadError: string | null = null;

  try {
    const baseUrl = process.env.MAIN_URL || "http://localhost:3000";
    const cookieStore = await cookies();
    const res = await fetch(`${baseUrl}/api/instructor/classes`, {
      cache: "no-store",
      headers: { cookie: cookieStore.toString() },
    });
    if (!res.ok) throw new Error(res.statusText);
    classes = (await res.json()) as InstructorClassDTO[];
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load classes.";
  }

  const totalEnrolled = classes.reduce((s, c) => s + c.enrolled, 0);
  const totalWaitlisted = classes.reduce((s, c) => s + c.waitlisted, 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          <>
            {/* Header bar */}
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Welcome back, {session.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Instructor portal</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
            </div>

            {loadError && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
                {loadError}
              </div>
            )}

            {/* Stats row */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                { label: "Classes", value: classes.length },
                { label: "Total Enrolled", value: totalEnrolled },
                { label: "On Waitlist", value: totalWaitlisted },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-white border border-black/5 shadow-sm p-5 text-center"
                >
                  <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                  <div className="mt-1 text-xs text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Class cards */}
            <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-semibold text-slate-900">My Classes</div>
                <Link
                  href="/dashboard/instructor/classes"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  View all →
                </Link>
              </div>

              {classes.length === 0 && !loadError ? (
                <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 p-10 text-center text-slate-500 text-sm">
                  No classes assigned for this semester.
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classes.map((c, i) => (
                    <Link
                      key={c.class_id}
                      href={`/dashboard/instructor/classes/${c.class_id}`}
                      className={[
                        "rounded-2xl p-5 text-white shadow-sm transition hover:-translate-y-0.5",
                        GRAD[i % GRAD.length],
                      ].join(" ")}
                    >
                      <div className="text-xs text-white/70">{c.section_id} · {c.semester} {c.year}</div>
                      <div className="mt-2 text-sm font-semibold leading-snug">
                        {c.course_name}{" "}
                        <span className="text-white/70">({c.course_code})</span>
                      </div>
                      <div className="mt-3 text-xs text-white/70">{fmtSlots(c.time_slots)}</div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-white/80">
                        <span>{c.enrolled}/{c.capacity} enrolled</span>
                        {c.waitlisted > 0 && (
                          <span className="rounded-full bg-white/20 px-2 py-0.5">
                            {c.waitlisted} waitlisted
                          </span>
                        )}
                        <span
                          className={[
                            "ml-auto rounded-full px-2 py-0.5",
                            c.status === "ACTIVE" ? "bg-emerald-400/30" : "bg-red-400/30",
                          ].join(" ")}
                        >
                          {c.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick-action links */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { href: "/dashboard/instructor/classes", label: "View Rosters", sub: "See enrolled students" },
                { href: "/dashboard/instructor/grades", label: "Submit Grades", sub: "Enter final grades" },
                { href: "/dashboard/instructor/waitlist", label: "Manage Waitlist", sub: "Approve or deny requests" },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="rounded-2xl bg-white border border-black/5 shadow-sm p-5 hover:bg-slate-50 transition group"
                >
                  <div className="text-sm font-semibold text-slate-900 group-hover:text-[#F07E62] transition">
                    {a.label} →
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{a.sub}</div>
                </Link>
              ))}
            </div>
          </>
        }
      />
    </div>
  );
}
