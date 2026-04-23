"use client";

import { useRouter } from "next/navigation";
import { type SubmitEvent, useState } from "react";

export default function SignUpForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    void (async () => {
      await new Promise((r) => setTimeout(r, 500));
      form.reset();
      setPending(false);
      router.push("/dashboard");
    })();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <span className="block text-sm font-medium text-neutral-800">Account type</span>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-neutral-700">
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="role" value="student" defaultChecked className="text-[#F07E62] focus:ring-[#F07E62]/30" />
            Student
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="role" value="instructor" className="text-[#F07E62] focus:ring-[#F07E62]/30" />
            Instructor
          </label>
        </div>
      </div>
      <div>
        <label htmlFor="signup-name" className="block text-sm font-medium text-neutral-800">
          Full name
        </label>
        <input
          id="signup-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm outline-none ring-[#F07E62]/0 transition focus:border-[#F07E62]/40 focus:ring-4 focus:ring-[#F07E62]/20"
          placeholder="Jordan Rivera"
        />
      </div>
      <div>
        <label htmlFor="signup-email" className="block text-sm font-medium text-neutral-800">
          Email
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm outline-none ring-[#F07E62]/0 transition focus:border-[#F07E62]/40 focus:ring-4 focus:ring-[#F07E62]/20"
          placeholder="you@school.edu"
        />
      </div>
      <div>
        <label htmlFor="signup-password" className="block text-sm font-medium text-neutral-800">
          Password
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm outline-none ring-[#F07E62]/0 transition focus:border-[#F07E62]/40 focus:ring-4 focus:ring-[#F07E62]/20"
          placeholder="At least 8 characters"
        />
      </div>
      <div>
        <label htmlFor="signup-confirm" className="block text-sm font-medium text-neutral-800">
          Confirm password
        </label>
        <input
          id="signup-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm outline-none ring-[#F07E62]/0 transition focus:border-[#F07E62]/40 focus:ring-4 focus:ring-[#F07E62]/20"
          placeholder="Repeat password"
        />
      </div>
      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <label className="flex items-start gap-2 text-sm text-neutral-600">
        <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 rounded border-black/20 text-[#F07E62] focus:ring-[#F07E62]/30" />
        <span>I agree to the terms and privacy policy.</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[#F07E62] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.35)] transition hover:brightness-[0.97] active:brightness-[0.95] disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
