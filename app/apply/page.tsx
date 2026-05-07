import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply | College0",
  description: "Apply to College0 as a student or instructor.",
};

export default function ApplyHubPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-14 pb-20">
      <p className="text-sm font-medium text-[#F07E62]">College0 · Admissions</p>
      <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">Apply</h1>
      <p className="mt-4 max-w-2xl text-neutral-600 leading-relaxed">
        Choose the path that fits you. Applications are reviewed by the Registrar. You do not need an account to apply.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <Link
          href="/apply/student"
          className="group rounded-[28px] border border-black/5 bg-white p-8 shadow-sm transition hover:border-[#F07E62]/30 hover:shadow-md"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-[#F07E62]">Prospective student</div>
          <h2 className="mt-3 text-xl font-semibold text-neutral-900 group-hover:text-neutral-950">
            Apply as Student
          </h2>
          <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
            Submit personal details and your prior GPA. If accepted, you&apos;ll receive a student ID and temporary
            password.
          </p>
          <span className="mt-6 inline-flex text-sm font-semibold text-neutral-900">
            Start application →
          </span>
        </Link>

        <Link
          href="/apply/instructor"
          className="group rounded-[28px] border border-black/5 bg-white p-8 shadow-sm transition hover:border-[#F07E62]/30 hover:shadow-md"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-[#F07E62]">Teaching</div>
          <h2 className="mt-3 text-xl font-semibold text-neutral-900 group-hover:text-neutral-950">
            Apply as Instructor
          </h2>
          <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
            Tell us about your expertise and qualifications. If approved, the Registrar will assign you to one or more
            classes.
          </p>
          <span className="mt-6 inline-flex text-sm font-semibold text-neutral-900">
            Start application →
          </span>
        </Link>
      </div>

      <p className="mt-12 text-sm text-neutral-500">
        <Link href="/public" className="font-medium text-neutral-800 underline-offset-4 hover:underline">
          Public dashboard
        </Link>
        {" · "}
        <Link href="/" className="font-medium text-neutral-800 underline-offset-4 hover:underline">
          Home
        </Link>
      </p>
    </div>
  );
}
