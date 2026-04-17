import Link from "next/link";

export default async function DashboardPage() {
  try {
    const baseUrl = process.env.MAIN_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/class/top`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch classes: ${response.statusText}`);
    }

    const classes = await response.json();

    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
        <div className="mx-auto max-w-[1200px] px-5 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_320px] gap-6">
            {/* Sidebar */}
            <aside className="hidden lg:block">
              <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white grid place-items-center font-semibold">
                    L
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Learnthru</div>
                    <div className="text-xs text-slate-500">Student portal</div>
                  </div>
                </div>

                <nav className="mt-6 space-y-1 text-sm">
                  {[
                    { label: "Dashboard", active: true },
                    { label: "Classroom" },
                    { label: "Live Lessons" },
                    { label: "Recorded Lessons" },
                    { label: "Video Library" },
                  ].map((item) => (
                    <a
                      key={item.label}
                      href="#"
                      className={[
                        "flex items-center gap-3 rounded-xl px-3 py-2 transition",
                        item.active
                          ? "bg-neutral-900 text-white"
                          : "text-slate-700 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-2.5 w-2.5 rounded-full",
                          item.active ? "bg-white/90" : "bg-slate-300",
                        ].join(" ")}
                        aria-hidden="true"
                      />
                      {item.label}
                    </a>
                  ))}
                </nav>

                <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <div className="text-sm font-semibold text-slate-900">Need help?</div>
                  <div className="mt-1 text-xs text-slate-600">
                    Do you have any problem while using the system?
                  </div>
                  <a
                    href="#"
                    className="mt-3 inline-flex items-center justify-center rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
                  >
                    Contact support
                  </a>
                </div>
              </div>
            </aside>

            {/* Main */}
            <main className="min-w-0">
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
                  {/* Home */}
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

                  {/* Notifications */}
                  <button
                    type="button"
                    className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl border border-black/10 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition"
                    aria-label="Notifications"
                    title="Notifications"
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

                  {/* Messages */}
                  <button
                    type="button"
                    className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-black/10 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition"
                    aria-label="Messages"
                    title="Messages"
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

                  {/* Date */}
                  <div className="hidden lg:block text-xs text-slate-500 pl-1">
                    {new Date().toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      weekday: "long",
                    })}
                  </div>

                  {/* Profile */}
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 transition"
                    aria-label="Profile menu"
                    title="Profile"
                  >
                    <span className="h-7 w-7 rounded-full bg-linear-to-br from-[#FDE7DF] to-white border border-black/5" />
                    <span className="hidden sm:block">Stella</span>
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
                      Welcome back, Stella Walton!
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

              {/* Classes */}
              <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-slate-900">Classes</div>
                  <a href="#" className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                    View all →
                  </a>
                </div>

                {classes.length === 0 ? (
                  <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 p-10 text-center text-slate-600 text-sm">
                    No classes found in the database.
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {classes.slice(0, 3).map((c: any, i: number) => (
                      <Link
                        key={c.id}
                        href={`/class/${c.id}`}
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
                      {(classes as any[]).slice(0, 5).map((c: any) => (
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
            </main>

            {/* Right panel */}
            <aside className="hidden xl:block">
              <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-linear-to-br from-[#FDE7DF] to-white border border-black/5" />
                  <div className="mt-3 text-sm font-semibold text-slate-900">Stelle Walton</div>
                  <div className="text-xs text-slate-500">Student</div>
                  <a
                    href="#"
                    className="mt-3 inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
                  >
                    Profile
                  </a>
                </div>

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
            </aside>
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error("Dashboard Page Error:", error);

    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
        <div className="mx-auto max-w-[1200px] px-5 py-8">
          <div className="rounded-2xl bg-red-50 border border-red-200 p-7">
          <h3 className="text-red-900 font-semibold text-xl">Critical Error</h3>
          <p className="mt-2 text-red-700">{error.message}</p>
          <p className="mt-4 text-sm text-red-700/80">
            Check your terminal for more details.
          </p>
        </div>
      </div>
      </div>
    );
  }
}

