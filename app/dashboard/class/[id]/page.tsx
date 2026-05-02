import Link from "next/link";
import { notFound } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

type Schedule = {
  day: string;
  start_time: string;
  end_time: string;
  location: string;
};

type Review = {
  stars: number;
  text: string;
};

type ClassDetails = {
  id: number;
  max_num_students: number;
  num_students_enrolled: number;
  course_name: string;
  course_code: number | string | null;
  credits: number;
  professor_name: string | null;
  professor_email: string | null;
  department_name: string;
  semester: string;
  year: number;
  class_description: string | null;
  course_description: string | null;
  schedule: Schedule[];
  reviews: Review[];
};

async function getClassDetails(id: string): Promise<ClassDetails | null> {
  const baseUrl = process.env.MAIN_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/class/${id}`, { cache: "no-store" });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch class details");
  }
  return res.json();
}

export default async function StudentClassPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const classData = await getClassDetails(id);
  if (!classData) notFound();

  const spotsLeft = classData.max_num_students - classData.num_students_enrolled;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <div className="w-full">
        <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block sticky top-0 h-[calc(100vh-4rem)]">
            <DashboardSidebar />
          </aside>

          <main className="min-w-0 px-6 py-6">
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-slate-900">{classData.course_name}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {classData.department_name} · {classData.semester} {classData.year} ·{" "}
                  <span className="font-semibold text-slate-800">{classData.course_code ?? "—"}</span> ·{" "}
                  {classData.credits} credits
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/dashboard/class/${classData.id}/review`}
                  className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-3 py-2 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97] active:brightness-[0.95] transition"
                >
                  Write review
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 transition"
                >
                  Back
                </Link>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
              <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">Instructor</div>
                    <div className="mt-2 text-sm text-slate-800">{classData.professor_name || "TBA"}</div>
                    <div className="mt-1 text-xs text-slate-500">{classData.professor_email || ""}</div>
                  </div>
                  <div className="text-right">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold border",
                        spotsLeft > 0
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-amber-50 text-amber-800 border-amber-200",
                      ].join(" ")}
                    >
                      {spotsLeft > 0 ? `${spotsLeft} spots open` : "Full"}
                    </span>
                    <div className="mt-2 text-xs text-slate-500">
                      Enrolled: {classData.num_students_enrolled} / {classData.max_num_students}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-semibold text-slate-900">Description</div>
                  <div className="mt-2 text-sm text-slate-700 leading-relaxed">
                    {classData.class_description || classData.course_description || "No description provided."}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-6">
                <div className="text-sm font-semibold text-slate-900">Meeting times</div>
                {classData.schedule?.length ? (
                  <ul className="mt-4 space-y-3 text-sm text-slate-700">
                    {classData.schedule.map((s, idx) => (
                      <li key={idx} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="font-semibold text-slate-900">{s.day}</div>
                        <div className="mt-1 text-sm text-slate-700">
                          {s.start_time}–{s.end_time}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{s.location}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4 text-sm text-slate-600">No schedule assigned yet.</div>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm p-6">
              <div className="text-sm font-semibold text-slate-900">Student reviews</div>
              {classData.reviews?.length ? (
                <div className="mt-4 space-y-3">
                  {classData.reviews.map((r, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs text-slate-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={i < r.stars ? "text-amber-500" : "text-slate-300"}>
                            ★
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{r.text}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 text-sm text-slate-600">No reviews yet for this class.</div>
              )}

              <div className="mt-5">
                <Link
                  href={`/dashboard/class/${classData.id}/review`}
                  className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 transition"
                >
                  Write your review →
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

