import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import ChatPanel from "@/components/ai/ChatPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getSession } from "@/lib/auth/session";
import type { StudentStatusDTO, AcademicStanding } from "@/app/api/student/status/route";

type ClassSummary = {
  id: number;
  course_name: string;
  course_code: string;
  professor_name: string | null;
  semester: string;
  year: number;
  average_rating: number | string | null;
  average_gpa: number | string | null;
};

const STANDING_BADGE: Record<
  AcademicStanding,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Active",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  HONOR_ROLL: {
    label: "Honor Roll",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  WARNING_MANDATORY_INTERVIEW: {
    label: "Interview Required",
    className: "border-orange-200 bg-orange-50 text-orange-800",
  },
  SUSPENDED: {
    label: "Suspended",
    className: "border-red-200 bg-red-50 text-red-800",
  },
  TERMINATED: {
    label: "Terminated",
    className: "border-red-300 bg-red-100 text-red-900",
  },
};

function StandingBanner({ standing }: { standing: AcademicStanding }) {
  if (standing === "ACTIVE") return null;

  const banners: Partial<Record<AcademicStanding, { style: string; title: string; body: string }>> = {
    HONOR_ROLL: {
      style: "border-amber-200 bg-amber-50 text-amber-900",
      title: "Honor Roll",
      body: "Congratulations — you've been placed on the Honor Roll this semester. One active warning may be removed. Contact the Registrar to apply.",
    },
    WARNING_MANDATORY_INTERVIEW: {
      style: "border-orange-200 bg-orange-50 text-orange-900",
      title: "Mandatory Interview Required",
      body: "Your GPA is between 2.0 and 2.25. A mandatory interview with the Registrar is required. Please contact the Registrar's office to schedule it as soon as possible.",
    },
    SUSPENDED: {
      style: "border-red-200 bg-red-50 text-red-900",
      title: "Account Suspended",
      body: "Your account has been suspended for this semester due to accumulated warnings. You must pay the required fine and complete a mandatory interview before reinstatement. Contact the Registrar.",
    },
    TERMINATED: {
      style: "border-red-300 bg-red-100 text-red-900",
      title: "Enrollment Terminated",
      body: "Your enrollment has been terminated. This occurs when cumulative GPA falls below 2.0 or the same course has been failed twice. Please contact the Registrar immediately.",
    },
  };

  const banner = banners[standing];
  if (!banner) return null;

  return (
    <div className={`rounded-2xl border px-5 py-4 mb-4 ${banner.style}`}>
      <div className="text-sm font-semibold">{banner.title}</div>
      <div className="mt-1 text-xs leading-relaxed opacity-90">{banner.body}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (session?.role === "registrar") redirect("/dashboard/registrar/applications");
  if (session?.role === "instructor") redirect("/dashboard/instructor");

  const firstName = session?.name?.split(" ")[0] ?? "Student";
  const fullName = session?.name ?? "Student";
  const baseUrl = process.env.MAIN_URL || "http://localhost:3000";

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const [classesResult, statusResult] = await Promise.allSettled([
    fetch(`${baseUrl}/api/class/top`, { cache: "no-store", headers: { cookie: cookieHeader } }),
    fetch(`${baseUrl}/api/student/status`, { cache: "no-store", headers: { cookie: cookieHeader } }),
  ]);

  let classes: ClassSummary[] = [];
  let status: StudentStatusDTO | null = null;
  let loadError: string | null = null;

  if (classesResult.status === "fulfilled" && classesResult.value.ok) {
    classes = (await classesResult.value.json()) as ClassSummary[];
  } else if (classesResult.status === "rejected") {
    loadError = classesResult.reason instanceof Error ? classesResult.reason.message : "Failed to load classes.";
  }

  if (statusResult.status === "fulfilled" && statusResult.value.ok) {
    status = (await statusResult.value.json()) as StudentStatusDTO;
  }

  const standing = status?.standing ?? "ACTIVE";
  const badge = STANDING_BADGE[standing];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        right={
          <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-6">
            {/* Profile */}
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-linear-to-br from-[#FDE7DF] to-white border border-black/5" />
              <div className="mt-3 text-sm font-semibold text-slate-900">{fullName}</div>
              <div className="text-xs text-slate-500">Student</div>
              {/* Academic standing badge */}
              <div className="mt-2">
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    badge.className,
                  ].join(" ")}
                >
                  {badge.label}
                </span>
              </div>
              {status && (
                <div className="mt-2 text-xs text-slate-500">
                  GPA {status.gpa.toFixed(2)}
                  {status.warning_count > 0 && (
                    <span className="ml-2 text-amber-600 font-semibold">
                      · {status.warning_count} warning{status.warning_count !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}
              <a
                href="#"
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
              >
                Profile
              </a>
            </div>

            <div className="mt-6">
              <ChatPanel role="student" />
            </div>

            {/* Calendar */}
            <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-700">December 2022</div>
                <div className="flex items-center gap-2 text-slate-400">
                  <button className="h-7 w-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100">
                    ‹
                  </button>
                  <button className="h-7 w-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100">
                    ›
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1 text-[11px] text-slate-500">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="text-center py-1 font-semibold">
                    {d}
                  </div>
                ))}
                {Array.from({ length: 35 }).map((_, idx) => {
                  const day = idx - 1;
                  const isActive = day === 13;
                  const inMonth = day >= 1 && day <= 31;
                  return (
                    <div
                      key={idx}
                      className={[
                        "h-8 grid place-items-center rounded-lg",
                        inMonth ? "text-slate-700" : "text-slate-300",
                        isActive ? "bg-[#F07E62] text-white font-semibold" : "hover:bg-white",
                      ].join(" ")}
                    >
                      {inMonth ? day : ""}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reminders */}
            <div className="mt-6">
              <div className="text-xs font-semibold text-slate-700">Reminders</div>
              <div className="mt-3 space-y-3">
                {[
                  { title: "Eng - Vocabulary test", time: "10 Dec 2022, Friday" },
                  { title: "Eng - Essay", time: "12 Dec 2022, Friday" },
                  { title: "Eng - Speaking Class", time: "18 Dec 2022, Friday" },
                ].map((r) => (
                  <div key={r.title} className="flex items-start gap-3">
                    <div className="mt-1 h-3 w-3 rounded-full bg-[#F07E62]" aria-hidden="true" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{r.title}</div>
                      <div className="text-[11px] text-slate-500">{r.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
        main={
          <>
            {/* Academic standing banners */}
            <StandingBanner standing={standing} />

            {/* Top bar */}
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M21 21l-4.3-4.3m1.3-5.2a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <input
                    placeholder="Search"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:pl-4">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-black/10 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition"
                  aria-label="Back to landing page"
                  title="Home"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M3 10.5l9-7 9 7V21a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V10.5z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>

                <button
                  type="button"
                  className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl border border-black/10 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition"
                  aria-label="Notifications"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M13.7 21a2 2 0 01-3.4 0"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#F07E62] ring-2 ring-white" />
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-black/10 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition"
                  aria-label="Messages"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4v8z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div className="hidden lg:block text-xs text-slate-500 pl-1">
                  {new Date().toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    weekday: "long",
                  })}
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 transition"
                  aria-label="Profile menu"
                >
                  <span className="h-7 w-7 rounded-full bg-linear-to-br from-[#FDE7DF] to-white border border-black/5" />
                  <span className="hidden sm:block">{firstName}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-slate-500">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Welcome hero */}
            <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
              <div className="p-6 sm:p-7 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-6 items-center">
                <div>
                  <div className="text-slate-900 text-lg font-semibold">
                    Welcome back, {fullName}!
                  </div>
                  <div className="mt-2 text-sm text-slate-600 max-w-xl">
                    New French speaking classes are available. Further in France for B1 and B2 levels. Learn more.
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Link
                      href="/"
                      className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition"
                    >
                      Buy Lesson
                    </Link>
                    <a href="#" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
                      Learn more
                    </a>
                  </div>
                </div>
                <div className="md:justify-self-end">
                  <div className="h-40 w-full md:w-52 rounded-2xl bg-linear-to-br from-[#FDE7DF] via-[#F7F5F1] to-white border border-black/5 grid place-items-center">
                    <div className="h-16 w-16 rounded-2xl bg-white shadow-sm border border-black/5 grid place-items-center text-slate-700 font-semibold">
                      ✦
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI panel for smaller breakpoints */}
            <div className="mt-6 xl:hidden">
              <ChatPanel role="student" />
            </div>

            {loadError && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
                {loadError}
              </div>
            )}

            {/* Classes */}
            <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-semibold text-slate-900">Classes</div>
                <Link href="/dashboard/classes" className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                  View all →
                </Link>
              </div>

              {classes.length === 0 ? (
                <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 p-10 text-center text-slate-600 text-sm">
                  No classes found in the database.
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {classes.slice(0, 3).map((c, i) => (
                    <Link
                      key={c.id}
                      href={`/dashboard/class/${c.id}`}
                      className={[
                        "rounded-2xl p-5 text-white shadow-sm transition hover:-translate-y-0.5",
                        i === 0
                          ? "bg-linear-to-br from-neutral-900 to-neutral-800"
                          : i === 1
                            ? "bg-linear-to-br from-[#F07E62] to-[#E86B4F]"
                            : "bg-linear-to-br from-neutral-900 to-[#F07E62]",
                      ].join(" ")}
                    >
                      <div className="text-xs text-white/80">{`${c.semester} ${c.year}`}</div>
                      <div className="mt-2 text-sm font-semibold leading-snug">
                        {c.course_name}{" "}
                        <span className="text-white/80">({c.course_code})</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-white/80">
                        <div className="truncate">{c.professor_name || "TBA"}</div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1">
                            ★ {Number(c.average_rating ?? 0).toFixed(1)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            GPA {Number(c.average_gpa ?? 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Lessons table */}
            <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-semibold text-slate-900">Lessons</div>
                <a href="#" className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                  View all →
                </a>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="py-3 pr-4 font-semibold">Class</th>
                      <th className="py-3 pr-4 font-semibold">Teacher Name</th>
                      <th className="py-3 pr-4 font-semibold">Members</th>
                      <th className="py-3 pr-4 font-semibold">Starting</th>
                      <th className="py-3 pr-4 font-semibold">Material</th>
                      <th className="py-3 font-semibold">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classes.slice(0, 5).map((c) => (
                      <tr key={c.id} className="text-slate-700">
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-slate-900 truncate max-w-[220px]">
                            {c.course_code}
                          </div>
                        </td>
                        <td className="py-3 pr-4 truncate">{c.professor_name || "TBA"}</td>
                        <td className="py-3 pr-4">
                          <div className="flex -space-x-2">
                            {[0, 1, 2].map((i) => (
                              <div
                                key={i}
                                className="h-7 w-7 rounded-full ring-2 ring-white bg-linear-to-br from-slate-200 to-slate-300"
                                aria-hidden="true"
                              />
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">
                          {new Date().toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-4">
                          <a
                            href="#"
                            className="inline-flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Download
                          </a>
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Done
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        }
      />
    </div>
  );
}
