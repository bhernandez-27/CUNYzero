"use client";

import { useEffect, useState, type FormEvent } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type {
  ClassesPageDTO,
  ClassSectionDTO,
  InstructorOptionDTO,
} from "@/app/api/registrar/classes/route";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

type TimeSlot = { day: string; start: string; end: string };
type FormState = "idle" | "submitting" | "error";

export default function ClassSetupPage() {
  const [data, setData] = useState<ClassesPageDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [capacity, setCapacity] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ day: "Mon", start: "09:00", end: "10:30" }]);
  const [formState, setFormState] = useState<FormState>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/registrar/classes", { cache: "no-store" });
        if (!res.ok) throw new Error();
        setData((await res.json()) as ClassesPageDTO);
      } catch {
        setLoadError("Could not load classes. Try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function addSlot() {
    setTimeSlots((prev) => [...prev, { day: "Mon", start: "09:00", end: "10:30" }]);
  }

  function removeSlot(idx: number) {
    setTimeSlots((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateSlot(idx: number, field: keyof TimeSlot, value: string) {
    setTimeSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  function resetForm() {
    setCourseName("");
    setCourseCode("");
    setInstructorId("");
    setCapacity("");
    setTimeSlots([{ day: "Mon", start: "09:00", end: "10:30" }]);
    setFormError(null);
    setFormState("idle");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!courseName || !courseCode || !instructorId || !capacity) {
      setFormError("All fields are required.");
      return;
    }
    setFormState("submitting");
    setFormError(null);
    try {
      const res = await fetch("/api/registrar/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          course_name: courseName,
          course_code: courseCode,
          instructor_id: instructorId,
          capacity: Number(capacity),
          time_slots: timeSlots,
        }),
      });
      const payload = (await res.json()) as ClassSectionDTO & { message?: string };
      if (!res.ok) {
        setFormError((payload as unknown as { message?: string }).message ?? "Could not create class.");
        setFormState("error");
        return;
      }
      setData((prev) =>
        prev ? { ...prev, classes: [...prev.classes, payload] } : prev,
      );
      resetForm();
      setShowForm(false);
    } catch {
      setFormError("Network error. Check your connection and try again.");
      setFormState("error");
    }
  }

  const availableInstructors = data?.instructors.filter((i) => !i.suspended) ?? [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          <div className="max-w-3xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">Class Setup</div>
                <div className="mt-1 text-sm text-slate-500">
                  Create and manage class sections for the upcoming semester.
                </div>
              </div>
              {!showForm && !loading && !loadError && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="shrink-0 inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97] transition"
                >
                  + New Class
                </button>
              )}
            </div>

            {/* Create form */}
            {showForm && (
              <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 rounded-2xl bg-white border border-black/5 shadow-sm p-5 space-y-4">
                <div className="text-sm font-semibold text-slate-900">New class section</div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Course Name</label>
                    <input
                      type="text"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="e.g. Data Structures"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Course Code</label>
                    <input
                      type="text"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      placeholder="e.g. CSCI-201"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Instructor</label>
                    <select
                      value={instructorId}
                      onChange={(e) => setInstructorId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50"
                    >
                      <option value="">Select instructor</option>
                      {availableInstructors.map((i) => (
                        <option key={i.instructor_id} value={i.instructor_id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                    {data?.instructors.some((i) => i.suspended) && (
                      <p className="mt-1 text-[10px] text-amber-600">Suspended instructors are excluded.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Capacity</label>
                    <input
                      type="number"
                      min={3}
                      max={200}
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      placeholder="e.g. 30"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50"
                    />
                  </div>
                </div>

                {/* Time slots */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-600">Meeting Times</label>
                    <button type="button" onClick={addSlot} className="text-xs font-semibold text-[#F07E62] hover:underline">
                      + Add slot
                    </button>
                  </div>
                  <div className="space-y-2">
                    {timeSlots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={slot.day}
                          onChange={(e) => updateSlot(idx, "day", e.target.value)}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25"
                        >
                          {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <input type="time" value={slot.start} onChange={(e) => updateSlot(idx, "start", e.target.value)}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25" />
                        <span className="text-xs text-slate-400">to</span>
                        <input type="time" value={slot.end} onChange={(e) => updateSlot(idx, "end", e.target.value)}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25" />
                        {timeSlots.length > 1 && (
                          <button type="button" onClick={() => removeSlot(idx)} className="text-slate-400 hover:text-red-500 transition text-xs">✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {formError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {formError}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={formState === "submitting"}
                    className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97] transition disabled:opacity-60"
                  >
                    {formState === "submitting" ? "Creating…" : "Create Class"}
                  </button>
                  <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Classes list */}
            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-sm text-slate-500">
                  Loading classes…
                </div>
              ) : loadError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
                  {loadError}
                </div>
              ) : !data?.classes.length ? (
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-center text-sm text-slate-500">
                  No classes set up yet. Click "New Class" to get started.
                </div>
              ) : (
                data.classes.map((c) => <ClassCard key={c.class_id} cls={c} />)
              )}
            </div>
          </div>
        }
      />
    </div>
  );
}

function ClassCard({ cls }: { cls: ClassSectionDTO }) {
  const slots = cls.time_slots.map((t) => `${t.day} ${t.start}–${t.end}`).join(", ");
  const fillPct = cls.capacity > 0 ? Math.round((cls.enrolled / cls.capacity) * 100) : 0;
  const atRisk = cls.enrolled < 3;

  return (
    <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{cls.course_name}</span>
            <span className="font-mono text-xs text-slate-400">{cls.section_id}</span>
            {atRisk && (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                &lt;3 students
              </span>
            )}
            {cls.status === "CANCELLED" && (
              <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                Cancelled
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">{cls.instructor_name} · {slots || "No schedule"}</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={["h-full rounded-full", fillPct >= 90 ? "bg-red-400" : fillPct >= 60 ? "bg-amber-400" : "bg-emerald-400"].join(" ")}
                style={{ width: `${fillPct}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">{cls.enrolled}/{cls.capacity} enrolled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
