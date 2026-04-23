"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import SignInForm from "./SignInForm";
import SignUpForm from "./SignUpForm";

type Mode = "signin" | "signup";

export default function AuthPageClient() {
  const searchParams = useSearchParams();
  const initial = useMemo<Mode>(() => {
    const m = searchParams.get("mode");
    return m === "signup" ? "signup" : "signin";
  }, [searchParams]);
  const [mode, setMode] = useState<Mode>(initial);

  return (
    <div className="mx-auto max-w-md px-6 py-14 sm:py-20">
      <div className="rounded-[28px] bg-white border border-black/5 shadow-[0_18px_45px_rgba(0,0,0,0.08)] p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {mode === "signin"
              ? "Use your school email to access your dashboard."
              : "Join College0 as a student or instructor."}
          </p>
        </div>

        <div
          className="mt-8 grid grid-cols-2 gap-1 rounded-xl bg-neutral-100/90 p-1"
          role="tablist"
          aria-label="Authentication"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            id="tab-signin"
            aria-controls="panel-signin"
            onClick={() => setMode("signin")}
            className={[
              "rounded-lg py-2.5 text-sm font-semibold transition",
              mode === "signin"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900",
            ].join(" ")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            id="tab-signup"
            aria-controls="panel-signup"
            onClick={() => setMode("signup")}
            className={[
              "rounded-lg py-2.5 text-sm font-semibold transition",
              mode === "signup"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900",
            ].join(" ")}
          >
            Sign up
          </button>
        </div>

        <div className="mt-8">
          <div
            id="panel-signin"
            role="tabpanel"
            aria-labelledby="tab-signin"
            hidden={mode !== "signin"}
            className={mode === "signin" ? "block" : "hidden"}
          >
            <SignInForm />
            <p className="mt-6 text-center text-sm text-neutral-600">
              New here?{" "}
              <button type="button" onClick={() => setMode("signup")} className="font-semibold text-[#F07E62] hover:underline">
                Create an account
              </button>
            </p>
          </div>
          <div
            id="panel-signup"
            role="tabpanel"
            aria-labelledby="tab-signup"
            hidden={mode !== "signup"}
            className={mode === "signup" ? "block" : "hidden"}
          >
            <SignUpForm />
            <p className="mt-6 text-center text-sm text-neutral-600">
              Already have an account?{" "}
              <button type="button" onClick={() => setMode("signin")} className="font-semibold text-[#F07E62] hover:underline">
                Sign in
              </button>
            </p>
          </div>
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
