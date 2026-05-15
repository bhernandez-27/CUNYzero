"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useRole } from "@/lib/auth/RoleContext";
import type { ComplaintSubject, ComplaintSubjectsDTO } from "@/app/api/complaints/subjects/route";

type SubjectType = "student" | "instructor";
type FormState = "idle" | "submitting" | "success" | "error";

export default function ComplaintPage() {
  const { role } = useRole();

  // Instructors can only target students.
  const allowedTargets: SubjectType[] =
    role === "instructor" ? ["student"] : ["student", "instructor"];

  const [subjectType, setSubjectType] = useState<SubjectType>(allowedTargets[0]!);
  const [subjectId, setSubjectId] = useState("");
  const [description, setDescription] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [complaintId, setComplaintId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<ComplaintSubjectsDTO>({ students: [], instructors: [] });
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/complaints/subjects", { cache: "no-store" });
        if (res.ok) setSubjects((await res.json()) as ComplaintSubjectsDTO);
      } finally {
        setLoadingSubjects(false);
      }
    })();
  }, []);

  // When subject type changes, reset the selected person
  function handleSubjectTypeChange(t: SubjectType) {
    setSubjectType(t);
    setSubjectId("");
  }

  const optionsForType: ComplaintSubject[] =
    subjectType === "student" ? subjects.students : subjects.instructors;

  const descriptionMin = 10;
  const descriptionMax = 1000;
  const descriptionLen = description.length;
  const isValid = subjectId.trim().length > 0 && descriptionLen >= descriptionMin;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || formState === "submitting") return;

    setFormState("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject_type: subjectType,
          subject_id: subjectId.trim(),
          description: description.trim(),
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        setErrorMsg(err.message ?? "Submission failed. Please try again.");
        setFormState("error");
        return;
      }

      const data = (await res.json()) as { complaint_id?: string };
      setComplaintId(data.complaint_id ?? null);
      setFormState("success");
    } catch {
      setErrorMsg("Network error. Check your connection and try again.");
      setFormState("error");
    }
  }

  function handleReset() {
    setSubjectType(allowedTargets[0]!);
    setSubjectId("");
    setDescription("");
    setErrorMsg(null);
    setComplaintId(null);
    setFormState("idle");
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          <div className="max-w-2xl">
            <div className="text-lg font-semibold text-slate-900">File a Complaint</div>
            <div className="mt-1 text-sm text-slate-500">
              Complaints are submitted to the Registrar for review. All submissions are kept
              confidential.
            </div>

            {formState === "success" ? (
              <SuccessState complaintId={complaintId} onReset={handleReset} />
            ) : (
              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">

                {/* Who are you complaining about */}
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-6 space-y-4">
                  <div className="text-sm font-semibold text-slate-900">
                    Who is this complaint about?
                  </div>

                  {/* Subject type toggle — only shown for students (instructors are locked to "student") */}
                  {allowedTargets.length > 1 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-2">Subject type</div>
                      <div className="flex gap-2">
                        {allowedTargets.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleSubjectTypeChange(t)}
                            className={[
                              "flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition capitalize",
                              subjectType === t
                                ? "bg-neutral-900 text-white border-neutral-900"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                            ].join(" ")}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {role === "instructor" && (
                    <p className="text-xs text-slate-400">
                      Instructors may only file complaints against students.
                    </p>
                  )}

                  {/* Subject dropdown */}
                  <div>
                    <label
                      htmlFor="subject-id"
                      className="block text-xs font-semibold text-slate-500 mb-1.5"
                    >
                      Select {subjectType === "student" ? "student" : "instructor"}
                      <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    {loadingSubjects ? (
                      <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
                    ) : optionsForType.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-400">
                        No {subjectType === "student" ? "classmates" : "instructors"} found for your current classes.
                      </div>
                    ) : (
                      <select
                        id="subject-id"
                        value={subjectId}
                        onChange={(e) => { const v = e.currentTarget.value; setSubjectId(v); }}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50 transition"
                      >
                        <option value="">— select a person —</option>
                        {optionsForType.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-6 space-y-3">
                  <div className="text-sm font-semibold text-slate-900">Describe the issue</div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-xs font-semibold text-slate-500 mb-1.5"
                    >
                      Description
                      <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.currentTarget.value)}
                      rows={6}
                      maxLength={descriptionMax}
                      placeholder="Describe the incident in detail. Include dates, context, and any relevant information that will help the Registrar investigate."
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50 transition resize-none"
                    />
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className={descriptionLen < descriptionMin ? "text-slate-400" : "text-emerald-600"}>
                        {descriptionLen < descriptionMin
                          ? `${descriptionMin - descriptionLen} more characters required`
                          : "Minimum length met"}
                      </span>
                      <span className="text-slate-400">
                        {descriptionLen} / {descriptionMax}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Error */}
                {formState === "error" && errorMsg ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {errorMsg}
                  </div>
                ) : null}

                {/* Notice */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  By submitting, you confirm that the information provided is accurate to the best of
                  your knowledge. False complaints may result in a warning on your record.
                </div>

                {/* Submit */}
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={!isValid || formState === "submitting"}
                    className={[
                      "inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition",
                      isValid && formState !== "submitting"
                        ? "bg-[#F07E62] text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97] active:brightness-[0.95]"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {formState === "submitting" ? "Submitting…" : "Submit complaint"}
                  </button>
                  {formState === "error" ? (
                    <button
                      type="button"
                      onClick={() => setFormState("idle")}
                      className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
                    >
                      Try again
                    </button>
                  ) : null}
                </div>
              </form>
            )}
          </div>
        }
      />
    </div>
  );
}

function SuccessState({
  complaintId,
  onReset,
}: {
  complaintId: string | null;
  onReset: () => void;
}) {
  return (
    <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm p-8 text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 grid place-items-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20 6L9 17l-5-5"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="mt-4 text-base font-semibold text-slate-900">Complaint submitted</div>
      <div className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto">
        Your complaint has been sent to the Registrar for review. You will be notified of the
        outcome.
      </div>

      {complaintId ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-mono text-slate-600">
          Reference: {complaintId}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onReset}
        className="mt-6 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
      >
        File another complaint
      </button>
    </div>
  );
}
