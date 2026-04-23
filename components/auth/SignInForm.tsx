"use client";

import { useRouter } from "next/navigation";
import { type SubmitEvent, useState } from "react";

export default function SignInForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    void (async () => {
      await new Promise((r) => setTimeout(r, 400));
      form.reset();
      setPending(false);
      router.push("/dashboard");
    })();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <input
          id="signin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm outline-none ring-[#F07E62]/0 transition focus:border-[#F07E62]/40 focus:ring-4 focus:ring-[#F07E62]/20"
          placeholder="••••••••"
        />
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
