"use client";

import { authErrorMessage } from "@/lib/auth/clientErrorMessage";
import { useRouter } from "next/navigation";
import { type SubmitEvent, useState } from "react";

export default function SignInForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setPending(true);
    const form = e.currentTarget;
    void (async () => {
      const fd = new FormData(form);
      const email = String(fd.get("email") ?? "").trim();
      const password = String(fd.get("password") ?? "");
      const remember = fd.get("remember") === "on";
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password, remember }),
        });
        if (!res.ok) {
          setFormError(await authErrorMessage(res));
          return;
        }
        const data = (await res.json()) as { role?: string };
        form.reset();
        if (data.role === "registrar") {
          router.push("/dashboard/registrar/applications");
        } else if (data.role === "instructor") {
          router.push("/dashboard/instructor");
        } else {
          router.push("/dashboard");
        }
      } catch {
        setFormError("Network error. Try again.");
      } finally {
        setPending(false);
      }
    })();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {formError}
        </p>
      ) : null}
      <div>
        <label htmlFor="signin-email" className="block text-sm font-medium text-neutral-800">
          Email
        </label>
        <input
          id="signin-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm outline-none ring-[#F07E62]/0 transition focus:border-[#F07E62]/40 focus:ring-4 focus:ring-[#F07E62]/20"
          placeholder="you@school.edu"
        />
      </div>
      <div>
        <label htmlFor="signin-password" className="block text-sm font-medium text-neutral-800">
          Password
        </label>
        <div className="relative mt-1.5">
          <input
            id="signin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 pr-11 text-sm text-neutral-900 shadow-sm outline-none ring-[#F07E62]/0 transition focus:border-[#F07E62]/40 focus:ring-4 focus:ring-[#F07E62]/20"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            name="remember"
            className="h-4 w-4 rounded border-black/20 text-[#F07E62] focus:ring-[#F07E62]/30"
          />
          Remember me
        </label>
        <button type="button" className="text-sm font-semibold text-[#F07E62] hover:underline">
          Forgot password?
        </button>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-xl bg-[#F07E62] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.35)] transition hover:brightness-[0.97] active:brightness-[0.95] disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
