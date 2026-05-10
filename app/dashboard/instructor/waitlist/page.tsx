"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { InstructorClassDTO, WaitlistStudentDTO } from "@/lib/instructor/types";

type ToastKind = "success" | "error";
type Toast = { id: string; kind: ToastKind; title: string; message?: string };

function uid() {
  return Math.random().toString(36).slice(2);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function WaitlistPage() {
  const searchParams = useSearchParams();
  const preselectedClassId = searchParams.get("class") ?? "";

  const [classes, setClasses] = useState<InstructorClassDTO[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(preselectedClassId);
  const [waitlist, setWaitlist] = useState<WaitlistStudentDTO[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingWaitlist, setLoadingWaitlist] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function pushToast(t: Omit<Toast, "id">) {
    const id = uid();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }

  // Load classes
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/instructor/classes", { cache: "no-store" });
        if (!alive) return;
        if (!res.ok) throw new Error(res.statusText);
        const data = (await res.json()) as InstructorClassDTO[];
        if (!alive) return;
        setClasses(data);
        if (!selectedClassId && data.length > 0) setSelectedClassId(data[0].class_id);
      } catch {
        // silently handled
      } finally {
        if (alive) setLoadingClasses(false);
      }
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load waitlist when class changes
  useEffect(() => {
    if (!selectedClassId) return;
    let alive = true;
    setWaitlist([]);
    setLoadingWaitlist(true);
    void (async () => {
      try {
        const res = await fetch(`/api/instructor/waitlist/${selectedClassId}`, { cache: "no-store" });
        if (!alive) return;
        if (!res.ok) throw new Error(res.statusText);
        const data = (await res.json()) as WaitlistStudentDTO[];
        if (!alive) return;
        setWaitlist(data);
      } catch (err) {
        if (!alive) return;
        pushToast({ kind: "error", title: "Failed to load waitlist", message: err instanceof Error ? err.message : undefined });
      } finally {
        if (alive) setLoadingWaitlist(false);
      }
    })();
    return () => { alive = false; };
  }, [selectedClassId]);

  async function handleAction(entry: WaitlistStudentDTO, action: "approve" | "deny") {
    if (busyId) return;
    setBusyId(entry.waitlist_id);
    try {
      const res = await fetch(`/api/instructor/waitlist/${selectedClassId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitlist_id: entry.waitlist_id, action }),
      });
      const data = (await res.json()) as { status?: string; message?: string; error?: string };
      if (!res.ok) {
        pushToast({ kind: "error", title: data.error ?? "Action failed", message: data.message });
        return;
      }
      pushToast({
        kind: "success",
        title: action === "approve" ? `${entry.student_name} enrolled` : `${entry.student_name} removed`,
        message: data.message,
      });
      setWaitlist((prev) => prev.filter((w) => w.waitlist_id !== entry.waitlist_id));
    } catch {
      pushToast({ kind: "error", title: "Network error", message: "Could not reach the server." });
    } finally {
      setBusyId(null);
    }
  }

  const selectedClass = classes.find((c) => c.class_id === selectedClassId);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      {/* Toasts */}
      <div className="fixed top-5 right-5 z-60 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg text-sm max-w-xs",
              t.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900",
            ].join(" ")}
          >
            <span
              className={[
                "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                t.kind === "success" ? "bg-emerald-500" : "bg-red-500",
              ].join(" ")}
            />
            <div>
              <div className="font-semibold">{t.title}</div>
              {t.message && <div className="text-xs opacity-80 mt-0.5">{t.message}</div>}
            </div>
          </div>
        ))}
      </div>

      <DashboardShell
        main={
          <>
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
              <div className="text-sm font-semibold text-slate-900">Waitlist Management</div>
              <Link
                href="/dashboard/instructor/classes"
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                ← Back to classes
              </Link>
            </div>

            {/* Class selector */}
            <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm p-6">
              <label className="text-xs font-semibold text-slate-700 block mb-2">
                Select Class
              </label>
              {loadingClasses ? (
                <div className="h-10 w-full rounded-xl bg-slate-100 animate-pulse" />
              ) : (
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.currentTarget.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50"
                >
                  <option value="">— choose a class —</option>
                  {classes.map((c) => (
                    <option key={c.class_id} value={c.class_id}>
                      {c.course_name} ({c.section_id}) · {c.waitlisted} waiting
                    </option>
                  ))}
                </select>
              )}

              {selectedClass && (
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span>{selectedClass.enrolled}/{selectedClass.capacity} seats filled</span>
                  {selectedClass.enrolled < selectedClass.capacity && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {selectedClass.capacity - selectedClass.enrolled} open seat{selectedClass.capacity - selectedClass.enrolled !== 1 ? "s" : ""}
                    </span>
                  )}
                  {selectedClass.enrolled >= selectedClass.capacity && (
                    <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      Class is full
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Waitlist table */}
            {selectedClassId && (
              <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm p-6">
                <div className="text-sm font-semibold text-slate-900 mb-4">
                  {loadingWaitlist
                    ? "Loading waitlist…"
                    : `Waitlisted Students (${waitlist.length})`}
                </div>

                {loadingWaitlist ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : waitlist.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-10 text-center text-slate-500 text-sm">
                    No students on the waitlist.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {waitlist.map((entry, idx) => (
                      <div
                        key={entry.waitlist_id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 grid place-items-center text-xs font-semibold text-slate-600 shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{entry.student_name}</div>
                            <div className="text-xs text-slate-500">{entry.email} · Joined {fmtDate(entry.joined_at)}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAction(entry, "approve")}
                            disabled={busyId === entry.waitlist_id}
                            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {busyId === entry.waitlist_id ? "…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAction(entry, "deny")}
                            disabled={busyId === entry.waitlist_id}
                            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        }
      />
    </div>
  );
}
