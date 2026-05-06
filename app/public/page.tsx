import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Public dashboard | College0",
  description:
    "Program overview, top and lowest rated classes, and top GPA students — no login required.",
};

type TopClass = {
  id: number;
  course_name: string;
  course_code: number | null;
  professor_name: string | null;
  semester: string;
  year: number;
  average_rating: number;
  average_gpa: number;
};

type TopStudent = {
  id: number;
  name: string;
  gpa: number | null;
};

async function getTopClasses(): Promise<TopClass[]> {
  const baseUrl = process.env.MAIN_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/class/top`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

async function getBottomClasses(): Promise<TopClass[]> {
  const baseUrl = process.env.MAIN_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/class/bottom`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

async function getTopGpaStudents(): Promise<TopStudent[]> {
  const baseUrl = process.env.MAIN_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/students/top-gpa`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default async function PublicDashboardPage() {
  const topClasses = await getTopClasses();
  const bottomClasses = await getBottomClasses();
  const topStudents = await getTopGpaStudents();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 pb-16">
      <header className="max-w-3xl">
        <p className="text-sm font-medium text-[#F07E62]">College0 · Public</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
          Public dashboard
        </h1>
        <p className="mt-4 text-neutral-600 leading-relaxed">
          College0 is a simulated college environment for applications, registration, grading, and
          AI-assisted guidance. Anyone can view this page — no account required. Below you&apos;ll find
          highly rated offerings, areas with weaker feedback, and students leading by cumulative GPA.
        </p>
      </header>

      <section className="mt-10 rounded-[28px] bg-white border border-black/5 shadow-sm overflow-hidden" aria-label="Program overview">
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <h2 className="text-lg font-semibold text-neutral-900">Program at a glance</h2>
          <p className="mt-3 text-sm text-neutral-600 leading-relaxed max-w-3xl">
            College0 mirrors a full academic term: the Registrar runs four phases (set-up, registration, instruction,
            grading). Students and instructors sign in for day-to-day work; visitors stay here on the public dashboard
            for rankings and exploration — or start an application without an account.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/apply/student"
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition"
            >
              Apply as Student
            </Link>
            <Link
              href="/apply/instructor"
              className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-[#F7F5F1]/50 px-4 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-[#F7F5F1] transition"
            >
              Apply as Instructor
            </Link>
            <Link
              href="/visitor-ai"
              className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 transition"
            >
              Visitor AI Q&A
            </Link>
            <Link href="/" className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:text-neutral-900 transition">
              Full program intro →
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="top-rated-heading">
        <h2 id="top-rated-heading" className="text-lg font-semibold text-neutral-900">
          Top-rated classes
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          By average star rating from course reviews (where available).
        </p>

        {topClasses.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-black/5 bg-white p-8 text-sm text-neutral-600">
            No class ratings yet, or the database could not be reached.
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topClasses.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/class/${c.id}`}
                  className="block rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:border-black/10 hover:shadow-md"
                >
                  <div className="text-xs text-neutral-500">
                    {c.semester} {c.year}
                  </div>
                  <div className="mt-1 font-semibold text-neutral-900">
                    {c.course_name}{" "}
                    <span className="font-normal text-neutral-500">({c.course_code})</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                    <span>{c.professor_name || "TBA"}</span>
                    <span className="text-neutral-400">·</span>
                    <span>★ {Number(c.average_rating).toFixed(1)}</span>
                    <span>GPA {Number(c.average_gpa).toFixed(2)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12" aria-labelledby="lowest-rated-heading">
        <h2 id="lowest-rated-heading" className="text-lg font-semibold text-neutral-900">
          Lowest-rated classes
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          By average star rating from course reviews (lowest first). Only classes with at least one
          review are included.
        </p>

        {bottomClasses.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-black/5 bg-white p-8 text-sm text-neutral-600">
            No reviewed classes yet (or the Python backend/database could not be reached).
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bottomClasses.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/class/${c.id}`}
                  className="block rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:border-black/10 hover:shadow-md"
                >
                  <div className="text-xs text-neutral-500">
                    {c.semester} {c.year}
                  </div>
                  <div className="mt-1 font-semibold text-neutral-900">
                    {c.course_name}{" "}
                    <span className="font-normal text-neutral-500">({c.course_code})</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                    <span>{c.professor_name || "TBA"}</span>
                    <span className="text-neutral-400">·</span>
                    <span>★ {Number(c.average_rating).toFixed(1)}</span>
                    <span>GPA {Number(c.average_gpa).toFixed(2)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12" aria-labelledby="top-gpa-heading">
        <h2 id="top-gpa-heading" className="text-lg font-semibold text-neutral-900">
          Top cumulative GPA students
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Will show students with the highest overall GPA in the system (public leaderboard).
        </p>

        {topStudents.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-black/5 bg-white p-8 text-sm text-neutral-600">
            No students found (or the Python backend/database could not be reached).
          </div>
        ) : (
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topStudents.map((s, idx) => (
              <li
                key={s.id}
                className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
              >
                <div className="text-xs text-neutral-500">Rank #{idx + 1}</div>
                <div className="mt-1 font-semibold text-neutral-900">{s.name}</div>
                <div className="mt-2 text-xs text-neutral-600">
                  GPA {s.gpa === null ? "N/A" : Number(s.gpa).toFixed(2)}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="mt-12 text-sm text-neutral-500">
        Signed-in students and staff can continue to use the{" "}
        <Link href="/dashboard" className="font-medium text-neutral-800 underline-offset-4 hover:underline">
          student portal
        </Link>{" "}
        (<code className="text-xs text-neutral-400">/dashboard</code>) separately from this public view.
      </p>
    </div>
  );
}
