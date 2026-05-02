"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import type { SectionRow, Toast } from "@/components/dashboard/registration/types";
import ToastStack from "@/components/dashboard/registration/ToastStack";
import SchedulePreview from "@/components/dashboard/registration/SchedulePreview";
import RegistrationTable from "@/components/dashboard/registration/RegistrationTable";
import SelectionsPanel from "@/components/dashboard/registration/SelectionsPanel";
import { hasScheduleConflict, uid } from "@/components/dashboard/registration/utils";

export default function RegistrationPage() {
  const initialRows: SectionRow[] = useMemo(
    () => [
      {
        id: "row_101",
        courseName: "Intro to Computer Science",
        sectionId: "CSCI-101-A",
        instructor: "Prof. Nguyen",
        timeSlots: [
          { day: "Mon", start: "10:00", end: "11:15" },
          { day: "Wed", start: "10:00", end: "11:15" },
        ],
        seatsAvailable: 6,
        status: "NOT_ENROLLED",
      },
      {
        id: "row_220",
        courseName: "Discrete Mathematics",
        sectionId: "MATH-220-B",
        instructor: "Prof. Patel",
        timeSlots: [
          { day: "Tue", start: "09:30", end: "10:45" },
          { day: "Thu", start: "09:30", end: "10:45" },
        ],
        seatsAvailable: 0,
        status: "NOT_ENROLLED",
      },
      {
        id: "row_305",
        courseName: "Writing Seminar",
        sectionId: "ENGL-305-C",
        instructor: "Prof. Rivera",
        timeSlots: [{ day: "Mon", start: "10:30", end: "11:45" }],
        seatsAvailable: 2,
        status: "NOT_ENROLLED",
      },
      {
        id: "row_410",
        courseName: "Modern World History",
        sectionId: "HIST-410-D",
        instructor: "Prof. Chen",
        timeSlots: [{ day: "Fri", start: "13:00", end: "14:15" }],
        seatsAvailable: 1,
        status: "NOT_ENROLLED",
      },
    ],
    [],
  );

  const [rows, setRows] = useState<SectionRow[]>(initialRows);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [query, setQuery] = useState("");
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

  const selectedRows = useMemo(() => rows.filter((r) => r.status === "SELECTED"), [rows]);
  const enrolledRows = useMemo(() => rows.filter((r) => r.status === "ENROLLED"), [rows]);
  const waitlistedRows = useMemo(() => rows.filter((r) => r.status === "WAITLISTED"), [rows]);
  const selectionCount = selectedRows.length + enrolledRows.length + waitlistedRows.length;

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = `${r.courseName} ${r.sectionId} ${r.instructor}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

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

    // 7c: schedule conflict (check against everything already selected/enrolled/waitlisted)
    const current = rows.filter((r) => r.status !== "NOT_ENROLLED");
    if (hasScheduleConflict(target, current)) {
      pushToast({
        kind: "error",
        title: "Schedule conflict",
        message: "This section overlaps with one of your current selections.",
      });
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

    const pending = rows.filter((r) => r.status === "SELECTED");
    const finalCount = pending.length + enrolledRows.length + waitlistedRows.length;

    if (finalCount < 2) {
      pushToast({
        kind: "error",
        title: "Select at least 2 courses",
        message: "The system requires 2–4 total course selections.",
      });
      return;
    }
    if (finalCount > 4) {
      pushToast({
        kind: "error",
        title: "Too many courses selected",
        message: "You can only register for up to 4 courses.",
      });
      return;
    }

    // Validate conflicts among pending selections vs existing schedule.
    const existing = rows.filter((r) => r.status === "ENROLLED" || r.status === "WAITLISTED");
    for (const p of pending) {
      if (hasScheduleConflict(p, existing)) {
        pushToast({
          kind: "error",
          title: "Schedule conflict",
          message: `Resolve conflicts before confirming (conflict with ${p.sectionId}).`,
        });
        return;
      }
      existing.push(p);
    }

    setConfirming(true);
    pushToast({ kind: "info", title: "Confirming registration…", message: "Finalizing your selections." });
    await new Promise((r) => window.setTimeout(r, 900));

    let enrolled = 0;
    let waitlisted = 0;
    setRows((prev) =>
      prev.map((r) => {
        if (r.status !== "SELECTED") return r;
        if (r.seatsAvailable > 0) {
          enrolled += 1;
          return { ...r, status: "ENROLLED", seatsAvailable: Math.max(0, r.seatsAvailable - 1) };
        }
        waitlisted += 1;
        return { ...r, status: "WAITLISTED" };
      }),
    );

    pushToast({
      kind: "success",
      title: "Registration updated",
      message: `ENROLLED: ${enrolled} · WAITLISTED: ${waitlisted}`,
    });
    setConfirming(false);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="w-full">
        <div className={["grid min-h-[calc(100vh-4rem)]", sidebarCollapsed ? "lg:grid-cols-[88px_1fr]" : "lg:grid-cols-[280px_1fr]"].join(" ")}>
          <aside className="hidden lg:block sticky top-0 h-[calc(100vh-4rem)]">
            <DashboardSidebar collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebar} />
          </aside>

          <main className="min-w-0 px-6 py-6">
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-slate-900">Registration</div>
                <div className="mt-1 text-sm text-slate-600">
                  Select 2–4 courses, then confirm. Outcomes match the Phase II prototype (ENROLLED / WAITLISTED / conflict / load limit).
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void confirmRegistration()}
                  disabled={confirming || busyRowId !== null}
                  className={[
                    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition",
                    selectionCount < 2 || selectionCount > 4
                      ? "bg-slate-100 text-slate-500"
                      : "bg-[#F07E62] text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97] active:brightness-[0.95]",
                    confirming ? "opacity-70" : "",
                  ].join(" ")}
                  aria-disabled={selectionCount < 2 || selectionCount > 4}
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
                <div className="mt-2 text-[11px] text-slate-500">
                  Tip: try “CSCI”, “Patel”, or “Mon 10:00” (time search isn’t enabled yet).
                </div>
              </div>

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

                <SelectionsPanel rows={rows} onRemove={removeSelection} onDrop={dropEnrollment} />

              <div className="px-5 py-4 border-t border-black/5 text-xs text-slate-500">
                Notes: this page is frontend-only for now (mock data). When the backend is ready, swap the mock list + selection/confirm handlers with real endpoints.
              </div>
              </div>

              <div className="xl:sticky xl:top-24 h-full">
                <SchedulePreview rows={rows} />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

