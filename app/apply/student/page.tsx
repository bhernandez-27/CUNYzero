"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type Phase = "form" | "success";

export default function ApplyStudentPage() {
  const [phase, setPhase] = useState<Phase>("form");
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const priorGpa = Number(fd.get("priorGpa"));

    const payload = {
      fullName: String(fd.get("fullName") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim() || undefined,
      street: String(fd.get("street") ?? "").trim() || undefined,
      city: String(fd.get("city") ?? "").trim() || undefined,
      state: String(fd.get("state") ?? "").trim() || undefined,
      postalCode: String(fd.get("postalCode") ?? "").trim() || undefined,
      priorGpa,
    };

    if (!payload.fullName) {
      setError("Please enter your full name.");
      return;
    }
    if (!payload.email) {
      setError("Please enter your email.");
      return;
    }
    if (!Number.isFinite(priorGpa) || priorGpa < 0 || priorGpa > 4) {
      setError("Prior GPA must be between 0 and 4.0.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/applications/student", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.message === "string" ? data.message : "Submission failed. Try again.");
        return;
      }
      if (data?.ok && typeof data.applicationId === "string") {
        setApplicationId(data.applicationId);
        setPhase("success");
        e.currentTarget.reset();
      } else {
        setError("Unexpected response from server.");
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (phase === "success" && applicationId) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 pb-24">
        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/80 p-8 shadow-sm">
          <p className="text-sm font-semibold text-emerald-900">Application received</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">Thank you</h1>
          <p className="mt-4 text-sm text-neutral-700 leading-relaxed">
            Your student application has been submitted. Save your application ID for your records. The Registrar has
            been notified and will email you with a decision.
          </p>
          <div className="mt-6 rounded-2xl bg-white border border-emerald-100 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Application ID</div>
            <div className="mt-1 font-mono text-sm text-neutral-900 break-all">{applicationId}</div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/public"
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition"
            >
              Back to public dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                setPhase("form");
                setApplicationId(null);
              }}
              className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-50 transition"
            >
              Submit another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 pb-20">
      <p className="text-sm font-medium text-[#F07E62]">College0 · Student application</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">Apply as Student</h1>
      <p className="mt-4 text-neutral-600 text-sm leading-relaxed">
        Provide your personal information and prior GPA. Acceptance follows Registrar review and enrollment policies.
      </p>

      <form onSubmit={onSubmit} className="mt-10 space-y-6 rounded-[28px] border border-black/5 bg-white p-8 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="fullName" className="block text-xs font-semibold text-neutral-700">
              Full name <span className="text-red-600">*</span>
            </label>
            <input
              id="fullName"
              name="fullName"
              required
              autoComplete="name"
              className="mt-1.5 w-full rounded-xl border border-black/10 bg-[#F7F5F1]/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-neutral-700">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@school.edu"
              className="mt-1.5 w-full rounded-xl border border-black/10 bg-[#F7F5F1]/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-xs font-semibold text-neutral-700">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              className="mt-1.5 w-full rounded-xl border border-black/10 bg-[#F7F5F1]/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="street" className="block text-xs font-semibold text-neutral-700">
              Street address
            </label>
            <input
              id="street"
              name="street"
              autoComplete="street-address"
              className="mt-1.5 w-full rounded-xl border border-black/10 bg-[#F7F5F1]/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25"
            />
          </div>
          <div>
            <label htmlFor="city" className="block text-xs font-semibold text-neutral-700">
              City
            </label>
            <input id="city" name="city" autoComplete="address-level2" className="mt-1.5 w-full rounded-xl border border-black/10 bg-[#F7F5F1]/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="state" className="block text-xs font-semibold text-neutral-700">
                State / Region
              </label>
              <input id="state" name="state" autoComplete="address-level1" className="mt-1.5 w-full rounded-xl border border-black/10 bg-[#F7F5F1]/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25" />
            </div>
            <div>
              <label htmlFor="postalCode" className="block text-xs font-semibold text-neutral-700">
                Postal code
              </label>
              <input id="postalCode" name="postalCode" autoComplete="postal-code" className="mt-1.5 w-full rounded-xl border border-black/10 bg-[#F7F5F1]/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="priorGpa" className="block text-xs font-semibold text-neutral-700">
              Prior cumulative GPA (4.0 scale) <span className="text-red-600">*</span>
            </label>
            <input
              id="priorGpa"
              name="priorGpa"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              max={4}
              required
              className="mt-1.5 w-full max-w-[200px] rounded-xl border border-black/10 bg-[#F7F5F1]/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25"
            />
            <p className="mt-1 text-[11px] text-neutral-500">Used by the Registrar under GPA and enrollment quota rules.</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.35)] hover:brightness-[0.97] disabled:opacity-60 transition"
          >
            {pending ? "Submitting…" : "Submit application"}
          </button>
          <Link href="/apply" className="text-sm font-semibold text-neutral-700 hover:text-neutral-900">
            ← All apply options
          </Link>
        </div>
      </form>
    </div>
  );
}
