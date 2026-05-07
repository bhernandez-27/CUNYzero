"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { SectionRow, Toast } from "@/components/dashboard/registration/types";
import ToastStack from "@/components/dashboard/registration/ToastStack";
import SchedulePreview from "@/components/dashboard/registration/SchedulePreview";
import RegistrationTable from "@/components/dashboard/registration/RegistrationTable";
import SelectionsPanel from "@/components/dashboard/registration/SelectionsPanel";
import { findScheduleConflicts, hasScheduleConflict, rowMeetsTimeWindow, toMinutes, uid } from "@/components/dashboard/registration/utils";
import type { RegistrationConfirmResponse, RegistrationSectionDTO } from "@/lib/registration/apiTypes";

export default function RegistrationPage() {
  const [rows, setRows] = useState<SectionRow[]>([]);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [periodClosed, setPeriodClosed] = useState(false);
  const [conflictHighlight, setConflictHighlight] = useState<string[] | null>(null);
  const [ghostRow, setGhostRow] = useState<SectionRow | null>(null);

  const [dept, setDept] = useState<string>("ALL");
  const [days, setDays] = useState<Record<"Mon" | "Tue" | "Wed" | "Thu" | "Fri", boolean>>({
    Mon: false,
    Tue: false,
    Wed: false,
    Thu: false,
    Fri: false,
  });
  const [earliest, setEarliest] = useState<string>("ANY");
  const [latest, setLatest] = useState<string>("ANY");
  const [credits, setCredits] = useState<string>("ANY");
  const [openOnly, setOpenOnly] = useState(false);

  const selectedRows = useMemo(() => rows.filter((r) => r.status === "SELECTED"), [rows]);
  const enrolledRows = useMemo(() => rows.filter((r) => r.status === "ENROLLED"), [rows]);
  const waitlistedRows = useMemo(() => rows.filter((r) => r.status === "WAITLISTED"), [rows]);
  const selectionCount = selectedRows.length + enrolledRows.length + waitlistedRows.length;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const res = await fetch("/api/registration/sections", { cache: "no-store" });
        if (res.status === 403) {
          const err = (await res.json()) as { error?: string };
          if (err.error === "PERIOD_CLOSED") {
            if (!alive) return;
            setPeriodClosed(true);
            return;
          }
        }
        if (!res.ok) throw new Error("Failed to load sections");
        const data = (await res.json()) as RegistrationSectionDTO[];
        if (!alive) return;
        setRows(
          data.map((s) => ({
            ...s,
            status: s.initialStatus ?? "NOT_ENROLLED",
            previousGrade: s.previousGrade ?? null,
          })),
        );
      } catch {
        if (!alive) return;
        setLoadError("Could not load registration sections.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const enabledDays = (Object.entries(days).filter(([, v]) => v).map(([k]) => k) as Array<
      "Mon" | "Tue" | "Wed" | "Thu" | "Fri"
    >);
    const earliestMin = earliest === "ANY" ? null : toMinutes(earliest);
    const latestMin = latest === "ANY" ? null : toMinutes(latest);
    const creditNum = credits === "ANY" ? null : Number(credits);

    if (earliestMin != null && latestMin != null && earliestMin > latestMin) return [];

    return rows.filter((r) => {
      const hay = `${r.courseName} ${r.sectionId} ${r.instructor}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (dept !== "ALL" && r.department !== dept) return false;
      if (creditNum != null && r.credits !== creditNum) return false;
      if (openOnly && r.seatsAvailable <= 0) return false;
      if (enabledDays.length) {
        const rowDays = new Set(r.timeSlots.map((s) => s.day));
        for (const d of enabledDays) {
          if (!rowDays.has(d)) return false;
        }
      }
      if (!rowMeetsTimeWindow(r, earliestMin, latestMin)) return false;
      return true;
    });
  }, [rows, query, dept, days, earliest, latest, credits, openOnly]);

  const deptOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.department))).sort(), [rows]);
  const creditOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.credits))).sort((a, b) => a - b), [rows]);
  const hasDayFilters = useMemo(() => Object.values(days).some(Boolean), [days]);
  const timeWindowInvalid = useMemo(() => {
    if (earliest === "ANY" || latest === "ANY") return false;
    return toMinutes(earliest) > toMinutes(latest);
  }, [earliest, latest]);

  const timeOptions = useMemo(() => {
    const mins = [];
    for (let m = 8 * 60; m <= 18 * 60; m += 30) mins.push(m);
    return mins.map((m) => {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      return `${hh}:${mm}`;
    });
  }, []);

  function pushToast(t: Omit<Toast, "id">) {
    const id = uid();
    setToasts((prev) => [{ id, ...t }, ...prev].slice(0, 4));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3500);
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function simulateSelect(sectionId: string) {
    if (busyRowId) return;
    const target = rows.find((r) => r.sectionId === sectionId);
    if (!target) return;
    if (target.status !== "NOT_ENROLLED") return;

    setBusyRowId(target.id);
    pushToast({ kind: "info", title: "Selecting…", message: `Preparing ${sectionId}` });

    await new Promise((r) => window.setTimeout(r, 750));

    // 7d: course load limit exceeded (SRS: pick 2–4)
    if (selectionCount >= 4) {
      pushToast({
        kind: "error",
        title: "Course load limit exceeded",
        message: "You can only register for up to 4 courses.",
      });
      setBusyRowId(null);
      return;
    }

    // Retake rule: block if student previously passed this course (grade != F and grade != null).
    const grade = target.previousGrade;
    if (grade != null && grade !== "F") {
      pushToast({
        kind: "error",
        title: "Retake not allowed",
        message: `You passed ${sectionId} with grade ${grade}. Retakes are only allowed after a failing grade.`,
      });
      setBusyRowId(null);
      return;
    }

    // 7c: schedule conflict (check against everything already selected/enrolled/waitlisted)
    const current = rows.filter((r) => r.status !== "NOT_ENROLLED");
    if (hasScheduleConflict(target, current)) {
      const conflicts = findScheduleConflicts(target, current);
      const conflictIds = [target.sectionId, ...conflicts.map((c) => c.sectionId)];
      const conflictNames = conflicts.map((c) => `${c.sectionId} (${c.courseName})`).join(", ");
      pushToast({
        kind: "error",
        title: "Schedule conflict",
        message: `${target.sectionId} conflicts with ${conflictNames}.`,
      });
      setConflictHighlight(conflictIds);
      setGhostRow({ ...target, status: "SELECTED" });
      window.setTimeout(() => {
        setConflictHighlight(null);
        setGhostRow(null);
      }, 4500);
      setBusyRowId(null);
      return;
    }

    setRows((prev) =>
      prev.map((r) =>
        r.id === target.id
          ? {
              ...r,
              status: "SELECTED",
            }
          : r,
      ),
    );

    pushToast({
      kind: "success",
      title: "Selected",
      message: `${sectionId} added to your selection. Confirm to finalize.`,
    });
    setBusyRowId(null);
  }

  function removeSelection(sectionId: string) {
    const target = rows.find((r) => r.sectionId === sectionId);
    if (!target || target.status !== "SELECTED") return;
    setRows((prev) => prev.map((r) => (r.id === target.id ? { ...r, status: "NOT_ENROLLED" } : r)));
    pushToast({ kind: "info", title: "Removed", message: `${sectionId} removed from your selection.` });
  }

  function dropEnrollment(sectionId: string) {
    const target = rows.find((r) => r.sectionId === sectionId);
    if (!target || (target.status !== "ENROLLED" && target.status !== "WAITLISTED")) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === target.id
          ? {
              ...r,
              status: "NOT_ENROLLED",
              seatsAvailable: target.status === "ENROLLED" ? r.seatsAvailable + 1 : r.seatsAvailable,
            }
          : r,
      ),
    );
    pushToast({
      kind: "info",
      title: "Dropped",
      message: `${sectionId} was removed from your schedule${target.status === "WAITLISTED" ? " (waitlist)" : ""}.`,
    });
  }

  async function confirmRegistration() {
    if (confirming || busyRowId) return;

    setConfirming(true);
    pushToast({ kind: "info", title: "Confirming registration…", message: "Finalizing your selections." });
    try {
      const selectedSectionIds = rows.filter((r) => r.status === "SELECTED").map((r) => r.sectionId);
      const currentSectionIds = rows
        .filter((r) => r.status === "ENROLLED" || r.status === "WAITLISTED")
        .map((r) => r.sectionId);

      const res = await fetch("/api/registration/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedSectionIds, currentSectionIds }),
      });
      if (!res.ok) throw new Error("confirm failed");
      const out = (await res.json()) as RegistrationConfirmResponse;

      if (out.status === "BLOCKED") {
        const conflict = out.errors.find((e) => e.code === "SCHEDULE_CONFLICT");
        pushToast({
          kind: "error",
          title: "Registration blocked",
          message: conflict ? conflict.message : out.errors[0]?.message ?? "Please fix issues and try again.",
        });
        return;
      }

      let enrolledN = 0;
      let waitlistedN = 0;
      setRows((prev) =>
        prev.map((r) => {
          if (r.status !== "SELECTED") return r;
          if (out.enrolled.includes(r.sectionId)) {
            enrolledN += 1;
            return { ...r, status: "ENROLLED", seatsAvailable: Math.max(0, r.seatsAvailable - 1) };
          }
          if (out.waitlisted.includes(r.sectionId)) {
            waitlistedN += 1;
            return { ...r, status: "WAITLISTED" };
          }
          return r;
        }),
      );

      pushToast({
        kind: "success",
        title: "Registration updated",
        message: `ENROLLED: ${enrolledN} · WAITLISTED: ${waitlistedN}`,
      });
    } catch {
      pushToast({ kind: "error", title: "Confirm failed", message: "Try again." });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <DashboardShell
        main={
          <>
            {periodClosed ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                <span className="font-semibold">Registration is closed.</span>{" "}
                Course registration is only available during the Course Registration period. Check back when the Registrar opens the next registration window.
              </div>
            ) : null}

            <div className="flex items-start sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-slate-900">Registration</div>
                <div className="mt-1 text-sm text-slate-600">
                  Select 2–4 courses, then confirm. Conflicts, seat caps, and waitlist placement are enforced by the backend.
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void confirmRegistration()}
                  disabled={confirming || busyRowId !== null || periodClosed}
                  className={[
                    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition",
                    selectionCount < 2 || selectionCount > 4 || periodClosed
                      ? "bg-slate-100 text-slate-500"
                      : "bg-[#F07E62] text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97] active:brightness-[0.95]",
                    confirming ? "opacity-70" : "",
                  ].join(" ")}
                  aria-disabled={selectionCount < 2 || selectionCount > 4 || periodClosed}
                  title={selectionCount < 2 ? "Select at least 2 courses" : selectionCount > 4 ? "Max 4 courses" : "Confirm registration"}
                >
                  {confirming ? "Confirming…" : "Confirm registration"}
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
              <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">Available sections</div>
                <div className="text-xs text-slate-600">
                  Selected: <span className="font-semibold text-slate-900">{selectionCount}</span> / 4{" "}
                  <span className="text-slate-400">·</span>{" "}
                  <span className="text-slate-600">Minimum: 2</span>
                </div>
              </div>

              <div className="px-5 py-4 border-b border-black/5">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M21 21l-4.3-4.3m1.3-5.2a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.currentTarget.value)}
                    placeholder="Search by course, section ID, or instructor…"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50"
                  />
                </div>
                <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3 items-end">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-600">Department</div>
                    <select
                      value={dept}
                      onChange={(e) => setDept(e.currentTarget.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50"
                    >
                      <option value="ALL">All</option>
                      {deptOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-slate-600">Days</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(["Mon", "Tue", "Wed", "Thu", "Fri"] as const).map((d) => {
                        const active = days[d];
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDays((prev) => ({ ...prev, [d]: !prev[d] }))}
                            className={[
                              "h-9 px-3 rounded-xl border text-sm font-semibold transition",
                              active ? "bg-neutral-900 text-white border-neutral-900" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
                            ].join(" ")}
                          >
                            {d}
                          </button>
                        );
                      })}
                      {hasDayFilters ? (
                        <button
                          type="button"
                          onClick={() => setDays({ Mon: false, Tue: false, Wed: false, Thu: false, Fri: false })}
                          className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Clear days
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-600">Earliest start</div>
                      <select
                        value={earliest}
                        onChange={(e) => setEarliest(e.currentTarget.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50"
                      >
                        <option value="ANY">Any</option>
                        {timeOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-600">Latest end</div>
                      <select
                        value={latest}
                        onChange={(e) => setLatest(e.currentTarget.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50"
                      >
                        <option value="ANY">Any</option>
                        {timeOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {timeWindowInvalid ? (
                    <div className="lg:col-span-2">
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
                        Earliest start must be earlier than (or equal to) latest end.
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-600">Credits</div>
                      <select
                        value={credits}
                        onChange={(e) => setCredits(e.currentTarget.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50"
                      >
                        <option value="ANY">Any</option>
                        {creditOptions.map((c) => (
                          <option key={c} value={String(c)}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="inline-flex items-center gap-2 h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={openOnly}
                        onChange={(e) => setOpenOnly(e.currentTarget.checked)}
                        className="h-4 w-4 accent-neutral-900"
                      />
                      Open seats only
                    </label>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div>
                    Showing <span className="font-semibold text-slate-700">{filteredRows.length}</span> of{" "}
                    <span className="font-semibold text-slate-700">{rows.length}</span> sections
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDept("ALL");
                      setDays({ Mon: false, Tue: false, Wed: false, Thu: false, Fri: false });
                      setEarliest("ANY");
                      setLatest("ANY");
                      setCredits("ANY");
                      setOpenOnly(false);
                    }}
                    className="text-slate-600 hover:text-slate-900 font-semibold"
                  >
                    Clear filters
                  </button>
                </div>
              </div>

                {loading ? (
                  <div className="px-5 py-6 text-sm text-slate-600">Loading sections…</div>
                ) : loadError ? (
                  <div className="px-5 py-6">
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</div>
                  </div>
                ) : filteredRows.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <div className="text-sm font-semibold text-slate-900">No results</div>
                    <div className="mt-1 text-sm text-slate-600">Try clearing filters or adjusting your search.</div>
                  </div>
                ) : (
                  <RegistrationTable
                    rows={filteredRows}
                    busyRowId={busyRowId}
                    confirming={confirming}
                    onAction={(kind, sectionId) => {
                      if (kind === "register") void simulateSelect(sectionId);
                      else if (kind === "remove") removeSelection(sectionId);
                      else dropEnrollment(sectionId);
                    }}
                  />
                )}

                <SelectionsPanel rows={rows} onRemove={removeSelection} onDrop={dropEnrollment} />

              </div>

              <div className="xl:sticky xl:top-24 h-full">
                <SchedulePreview rows={rows} highlightSectionIds={conflictHighlight ?? undefined} ghostRow={ghostRow} />
              </div>
            </div>
          </>
        }
      />
    </div>
  );
}

