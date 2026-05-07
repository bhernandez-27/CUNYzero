"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { AdvisorProfileDTO } from "@/app/api/advisor/route";

type ChatMsg = {
  id: string;
  from: "user" | "assistant";
  text: string;
  usedLlmFallback?: boolean;
};

type PageState = "loading" | "error" | "no_history" | "ready";

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function AdvisorPage() {
  const [profile, setProfile] = useState<AdvisorProfileDTO | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/advisor", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load advisor profile");
        const data = (await res.json()) as AdvisorProfileDTO;
        setProfile(data);
        const hasHistory = data.semesters.some((s) => s.semester_gpa != null);
        setPageState(hasHistory ? "ready" : "no_history");
      } catch {
        setLoadError("Could not load your academic profile. Try again later.");
        setPageState("error");
      }
    })();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          <div className="max-w-2xl">
            <div className="text-lg font-semibold text-slate-900">AI Academic Advisor</div>
            <div className="mt-1 text-sm text-slate-500">
              Personalized guidance based on your academic history, GPA, and graduation progress.
            </div>

            <div className="mt-6">
              {pageState === "loading" && (
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-sm text-slate-500">
                  Loading your academic profile…
                </div>
              )}

              {pageState === "error" && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
                  {loadError}
                </div>
              )}

              {pageState === "no_history" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8 text-center">
                  <div className="text-sm font-semibold text-slate-700">Academic history required</div>
                  <div className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto">
                    The AI Academic Advisor requires at least one completed semester on record.
                    Check back after your first semester grades are posted.
                  </div>
                </div>
              )}

              {pageState === "ready" && profile && (
                <AdvisorView profile={profile} />
              )}
            </div>
          </div>
        }
      />
    </div>
  );
}

function AdvisorView({ profile }: { profile: AdvisorProfileDTO }) {
  const gpa = profile.cumulative_gpa;
  const remaining = Math.max(0, 8 - profile.courses_completed);
  const progressPct = Math.min(100, (profile.courses_completed / 8) * 100);
  const lastSem = [...profile.semesters].find((s) => s.semester_gpa != null);

  const risk = getRisk(gpa, profile.warning_count);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [initializing, setInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function generateAdvisory() {
    setInitializing(true);
    setInitError(null);
    try {
      const res = await fetch("/api/advisor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            "Please provide a comprehensive academic advisory for me. Cover: my GPA trend, current academic risk level, graduation readiness, and your top 2–3 recommendations for next steps.",
          profile,
        }),
      });
      const payload = (await res.json()) as { reply?: string; message?: string };
      if (!res.ok || !payload.reply) {
        setInitError(payload.message ?? "Could not generate initial advisory.");
        return;
      }
      setMessages([{ id: uid(), from: "assistant", text: payload.reply, usedLlmFallback: true }]);
    } catch {
      setInitError("Network error while loading your advisory. Try refreshing.");
    } finally {
      setInitializing(false);
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setChatError(null);
    const text = (inputRef.current?.value ?? "").trim();
    if (!text) return;

    const userMsg: ChatMsg = { id: uid(), from: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    if (inputRef.current) inputRef.current.value = "";

    setPending(true);
    try {
      const res = await fetch("/api/advisor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, profile }),
      });
      const payload = (await res.json()) as { reply?: string; message?: string; usedLlmFallback?: boolean };
      if (!res.ok || !payload.reply) {
        setChatError(payload.message ?? "AI service error. Try again.");
        return;
      }
      setMessages((prev) => [
        ...prev,
        { id: uid(), from: "assistant", text: payload.reply!, usedLlmFallback: payload.usedLlmFallback },
      ]);
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch {
      setChatError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Cumulative GPA"
          value={gpa != null ? gpa.toFixed(2) : "—"}
          sub="4.0 scale"
          accent={gpaColor(gpa)}
        />
        <StatCard
          label="Last Semester"
          value={lastSem?.semester_gpa != null ? lastSem.semester_gpa.toFixed(2) : "—"}
          sub={lastSem ? `${lastSem.semester} ${lastSem.year}` : "No history"}
        />
        <StatCard
          label="Progress"
          value={`${profile.courses_completed}/8`}
          sub={remaining === 0 ? "Graduation eligible" : `${remaining} remaining`}
          accent={remaining === 0 ? "text-emerald-600" : undefined}
        />
        <StatCard
          label="Warnings"
          value={String(profile.warning_count)}
          sub="3 = suspension"
          accent={profile.warning_count >= 2 ? "text-red-600" : profile.warning_count === 1 ? "text-amber-600" : undefined}
        />
      </div>

      {/* Risk + graduation progress */}
      <div className={["rounded-2xl border px-5 py-4 text-sm", risk.cardStyle].join(" ")}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className="font-semibold">{risk.label}</span>
            {risk.body ? <span className="ml-1">{risk.body}</span> : null}
          </div>
          {profile.honor_roll && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-300 bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-800">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              Honor Roll
            </span>
          )}
        </div>

        {/* Graduation progress bar */}
        <div className="mt-3 h-2 w-full rounded-full bg-black/10 overflow-hidden">
          <div
            className={["h-full rounded-full transition-all duration-500", remaining === 0 ? "bg-emerald-500" : "bg-[#F07E62]"].join(" ")}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs opacity-70">
          <span>0 courses</span>
          <span>8 required for graduation</span>
        </div>
      </div>

      {/* Initial advisory / chat */}
      <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">AI Advisor</div>
            <div className="text-[11px] text-slate-500">Personalized guidance · Gemini fallback</div>
          </div>
          <span className="text-[11px] font-semibold rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
            Student
          </span>
        </div>

        <div className="p-4 space-y-3 max-h-[420px] overflow-auto">
          {initializing ? (
            <div className="text-sm text-slate-400 py-4 text-center">Generating your advisory…</div>
          ) : initError ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {initError}
              </div>
              <button
                type="button"
                onClick={generateAdvisory}
                className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.35)] transition hover:brightness-[0.97]"
              >
                Try again
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-6 text-center">
              <div className="text-sm text-slate-500 mb-4">
                Get a personalized assessment of your GPA trend, academic risk, and graduation readiness.
              </div>
              <button
                type="button"
                onClick={generateAdvisory}
                className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.35)] transition hover:brightness-[0.97]"
              >
                Generate Advisory
              </button>
            </div>
          ) : null}

          {messages.map((m) => {
            const isUser = m.from === "user";
            return (
              <div key={m.id} className={isUser ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={[
                    "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    isUser
                      ? "bg-neutral-900 text-white"
                      : "bg-slate-50 text-slate-900 border border-slate-100",
                  ].join(" ")}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  {!isUser && m.usedLlmFallback ? (
                    <div className="mt-2 text-[11px] text-slate-500">
                      This answer was generated by a general AI and may contain inaccuracies.
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 pb-4">
          {chatError ? (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">
              {chatError}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={2}
              placeholder={messages.length === 0 ? "Generate your advisory first…" : "Ask a follow-up question…"}
              disabled={pending || initializing || messages.length === 0}
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={pending || initializing || messages.length === 0}
              className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.35)] transition hover:brightness-[0.97] active:brightness-[0.95] disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={["mt-1 text-2xl font-bold", accent ?? "text-slate-900"].join(" ")}>{value}</div>
      <div className="mt-0.5 text-xs text-slate-400">{sub}</div>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function gpaColor(gpa: number | null): string {
  if (gpa == null) return "text-slate-900";
  if (gpa >= 3.5) return "text-emerald-600";
  if (gpa >= 2.25) return "text-slate-900";
  if (gpa >= 2.0) return "text-amber-600";
  return "text-red-600";
}

function getRisk(
  gpa: number | null,
  warnings: number,
): { label: string; body: string; cardStyle: string } {
  if (gpa != null && gpa < 2.0) {
    return {
      label: "Academic Risk: Critical.",
      body: "Your GPA is below 2.0. Per college policy, continued enrollment is subject to termination.",
      cardStyle: "border-red-200 bg-red-50 text-red-900",
    };
  }
  if (gpa != null && gpa < 2.25) {
    return {
      label: "Academic Warning.",
      body: "Your GPA is between 2.0 and 2.25. A mandatory Registrar interview is required.",
      cardStyle: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }
  if (warnings >= 2) {
    return {
      label: "Warning Notice.",
      body: `You have ${warnings} active warnings. One more results in suspension.`,
      cardStyle: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }
  return {
    label: "Good Standing.",
    body: "Your academic record meets all requirements.",
    cardStyle: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
}
