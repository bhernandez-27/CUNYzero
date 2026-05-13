"use client";

import Link from "next/link";
import SignInForm from "./SignInForm";

export default function AuthPageClient() {
  return (
    <div className="mx-auto max-w-md px-6 py-14 sm:py-20">
      <div className="rounded-[28px] bg-white border border-black/5 shadow-[0_18px_45px_rgba(0,0,0,0.08)] p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Sign in</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Use your school email and password to access College0.
          </p>
        </div>

        <div className="mt-8">
          <SignInForm />
          <p className="mt-6 text-center text-sm text-neutral-600">
            New here? Apply as a{" "}
            <Link href="/apply/student" className="font-semibold text-[#F07E62] hover:underline">
              Student
            </Link>{" "}
            or{" "}
            <Link href="/apply/instructor" className="font-semibold text-[#F07E62] hover:underline">
              Instructor
            </Link>
            .
          </p>
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-neutral-500">
        <Link href="/" className="font-medium text-neutral-700 hover:text-neutral-900">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
