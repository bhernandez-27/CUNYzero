"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type Phase = "form" | "success";

export default function ApplyInstructorPage() {
  const [phase, setPhase] = useState<Phase>("form");
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const payload = {
      fullName: String(fd.get("fullName") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim() || undefined,
      fieldOfExpertise: String(fd.get("fieldOfExpertise") ?? "").trim(),
      credentialsSummary: String(fd.get("credentialsSummary") ?? "").trim(),
    };

    if (!payload.fullName) {
      setError("Please enter your full name.");
      return;
    }
    if (!payload.email) {
      setError("Please enter your email.");
      return;
    }
    if (!payload.fieldOfExpertise) {
      setError("Please enter your field of expertise.");
      return;
    }
    if (payload.credentialsSummary.length < 20) {
      setError("Qualifications summary must be at least 20 characters.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/applications/instructor", {
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
            Your instructor application is pending review. Save your application ID. If approved, you will receive
            credentials and class assignments from the Registrar.
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
      <p className="text-sm font-medium text-[#F07E62]">College0 · Instructor application</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">Apply as Instructor</h1>
      <p className="mt-4 text-neutral-600 text-sm leading-relaxed">
        Share your background so the Registrar can evaluate your fit. Instructor rejections do not require a written
        justification.
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
            <label htmlFor="fieldOfExpertise" className="block text-xs font-semibold text-neutral-700">
              Field of expertise / discipline <span className="text-red-600">*</span>
            </label>
            <input
              id="fieldOfExpertise"
              name="fieldOfExpertise"
              required
              placeholder="e.g. Computer Science, Composition"
              className="mt-1.5 w-full rounded-xl border border-black/10 bg-[#F7F5F1]/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="credentialsSummary" className="block text-xs font-semibold text-neutral-700">
              Qualifications summary <span className="text-red-600">*</span>
            </label>
            <textarea
              id="credentialsSummary"
              name="credentialsSummary"
              required
              rows={5}
              minLength={20}
              placeholder="Degrees, teaching experience, certifications, or research focus (minimum 20 characters)."
              className="mt-1.5 w-full resize-y rounded-xl border border-black/10 bg-[#F7F5F1]/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25"
            />
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
