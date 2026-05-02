"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import ConfirmOnceModal from "@/components/dashboard/reviews/ConfirmOnceModal";
import StarRating from "@/components/dashboard/reviews/StarRating";
import ToastStack from "@/components/dashboard/registration/ToastStack";
import type { Toast } from "@/components/dashboard/registration/types";
import { uid } from "@/components/dashboard/registration/utils";
import { getReviewContext, submitReview } from "@/lib/reviews/api";
import type { ReviewContextResponse, SubmitReviewResult } from "@/lib/reviews/types";

function useSidebarCollapsed() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("college0.sidebarCollapsed");
      if (raw === "1") setSidebarCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem("college0.sidebarCollapsed", next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return { sidebarCollapsed, toggleSidebar };
}

export default function WriteReviewPage() {
  const params = useParams<{ id: string }>();
  const classId = Number(params?.id);

  const { sidebarCollapsed, toggleSidebar } = useSidebarCollapsed();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [ctx, setCtx] = useState<ReviewContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [result, setResult] = useState<SubmitReviewResult | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const lockedReason = useMemo(() => {
    if (!ctx) return null;
    if (!ctx.eligibility.canReview) return ctx.eligibility.reason ?? "Review is not available for this class.";
    return null;
  }, [ctx]);

  function pushToast(t: Omit<Toast, "id">) {
    const id = uid();
    setToasts((prev) => [{ id, ...t }, ...prev].slice(0, 4));
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
  }
  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  useEffect(() => {
    if (!Number.isFinite(classId) || classId <= 0) {
      setLoading(false);
      setLoadError("Invalid class id.");
      return;
    }
    let alive = true;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const c = await getReviewContext(classId);
        if (!alive) return;
        setCtx(c);
      } catch {
        if (!alive) return;
        setLoadError("Could not load class review context.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [classId]);

  const canSubmit = useMemo(() => {
    if (!ctx?.eligibility.canReview) return false;
    if (pending) return false;
    if (result && result.status !== "BLOCKED") return false; // one-and-done after publish/masked
    if (stars < 1 || stars > 5) return false;
    if (!text.trim()) return false;
    return true;
  }, [ctx, pending, result, stars, text]);

  async function doSubmit() {
    if (!ctx) return;
    if (!canSubmit) return;
    setPending(true);
    pushToast({ kind: "info", title: "Submitting…", message: "Processing your review." });
    try {
      const r = await submitReview({ classId: ctx.class.id, stars, text: text.trim() });
      setResult(r);
      if (r.status === "BLOCKED") {
        pushToast({ kind: "error", title: "Review blocked", message: r.message });
      } else if (r.status === "PUBLISHED_MASKED") {
        pushToast({ kind: "success", title: "Published (masked)", message: "1 warning issued. Taboo words were masked." });
      } else {
        pushToast({ kind: "success", title: "Published", message: "Your review was published." });
      }
    } catch {
      pushToast({ kind: "error", title: "Submission failed", message: "Try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <ConfirmOnceModal
        open={confirmOpen}
        title="Submit review?"
        body="You can only submit one review for a class. Once it’s published, it can’t be edited or removed. Continue?"
        confirmText="Yes, submit"
        cancelText="Cancel"
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void doSubmit();
        }}
      />

      <div className="w-full">
        <div
          className={[
            "grid min-h-[calc(100vh-4rem)]",
            sidebarCollapsed ? "lg:grid-cols-[88px_1fr]" : "lg:grid-cols-[280px_1fr]",
          ].join(" ")}
        >
          <aside className="hidden lg:block sticky top-0 h-[calc(100vh-4rem)]">
            <DashboardSidebar collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebar} />
          </aside>

          <main className="min-w-0 px-6 py-6">
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-slate-900">Write course review</div>
                <div className="mt-1 text-sm text-slate-600">
                  Reviews are anonymous to everyone except the Registrar. Taboo words may be masked or blocked.
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5">
                {loading ? (
                  <div className="text-sm text-slate-600">Loading class…</div>
                ) : loadError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</div>
                ) : ctx ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {ctx.class.courseName}{" "}
                        <span className="font-normal text-slate-500">
                          ({ctx.class.courseCode ?? "—"}) · {ctx.class.semester} {ctx.class.year}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 truncate">
                        Instructor: {ctx.class.instructorName ?? "TBA"} · Class ID: {ctx.class.id}
                      </div>
                    </div>
                    {lockedReason ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                        Eligible
                      </span>
                    )}
                  </div>
                ) : null}
              </div>

              {ctx && lockedReason ? (
                <div className="px-5 py-5">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                    <div className="font-semibold">Review unavailable</div>
                    <div className="mt-1 opacity-90">{lockedReason}</div>
                  </div>
                </div>
              ) : null}

              {ctx && !lockedReason ? (
                <div className="px-5 py-5">
                  {result ? <ResultBanner result={result} /> : null}

                  <div className="mt-5">
                    <div className="text-sm font-semibold text-slate-900">Rating</div>
                    <div className="mt-2">
                      <StarRating value={stars} onChange={setStars} disabled={pending || (result?.status !== "BLOCKED" && !!result)} />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="text-sm font-semibold text-slate-900" htmlFor="review-text">
                      Your review
                    </label>
                    <textarea
                      id="review-text"
                      value={text}
                      onChange={(e) => setText(e.currentTarget.value)}
                      rows={6}
                      disabled={pending || (result?.status !== "BLOCKED" && !!result)}
                      placeholder="Write your feedback…"
                      className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50 disabled:opacity-60"
                    />
                    <div className="mt-2 text-[11px] text-slate-500">
                      One-time submission. Avoid taboo language; it may be masked or blocked.
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStars(0);
                        setText("");
                        setResult(null);
                        pushToast({ kind: "info", title: "Reset", message: "Draft cleared." });
                      }}
                      className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
                      disabled={pending}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmOpen(true)}
                      disabled={!canSubmit}
                      className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97] active:brightness-[0.95] transition disabled:opacity-60"
                    >
                      Submit review
                    </button>
                  </div>
                </div>
              ) : null}

              {!loading && !loadError && !ctx ? (
                <div className="px-5 py-6 text-sm text-slate-600">No class context found.</div>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function ResultBanner(props: { result: SubmitReviewResult }) {
  const r = props.result;
  if (r.status === "BLOCKED") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
        <div className="font-semibold">Blocked</div>
        <div className="mt-1 opacity-90">{r.message}</div>
        <div className="mt-2 text-xs opacity-80">Warnings issued: {r.warningsIssued}</div>
      </div>
    );
  }
  if (r.status === "PUBLISHED_MASKED") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
        <div className="font-semibold">Published (masked)</div>
        <div className="mt-1 opacity-90">Taboo words were masked. Warnings issued: {r.warningsIssued}</div>
        <div className="mt-3 rounded-xl border border-amber-200 bg-white/60 px-3 py-2 text-sm whitespace-pre-wrap">
          {r.finalText}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
      <div className="font-semibold">Published</div>
      <div className="mt-1 opacity-90">Warnings issued: {r.warningsIssued}</div>
      <div className="mt-3 rounded-xl border border-emerald-200 bg-white/60 px-3 py-2 text-sm whitespace-pre-wrap">
        {r.finalText}
      </div>
    </div>
  );
}

