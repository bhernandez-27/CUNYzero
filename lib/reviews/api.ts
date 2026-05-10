import type { ReviewContextResponse, SubmitReviewRequest, SubmitReviewResult } from "./types";

/**
 * Frontend adapter for the review backend.
 * Replace the implementations here when the Python API is ready.
 */

const TABOO = ["terrible", "awful", "hate"];

function countTaboo(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const w of TABOO) {
    // count whole-word-ish occurrences
    const re = new RegExp(`\\b${escapeRegExp(w)}\\b`, "g");
    const matches = lower.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

function maskTaboo(text: string): string {
  let out = text;
  for (const w of TABOO) {
    const re = new RegExp(`\\b${escapeRegExp(w)}\\b`, "gi");
    out = out.replace(re, (m) => "*".repeat(m.length));
  }
  return out;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getReviewContext(classId: number): Promise<ReviewContextResponse> {
  // MOCK: pretend classId 4 has grade posted; classId 3 already reviewed.
  await sleep(250);
  const gradePosted = classId === 4;
  const alreadyReviewed = classId === 3;
  const canReview = !gradePosted && !alreadyReviewed;

  return {
    class: {
      id: classId,
      courseName:
        classId === 1
          ? "Intro to Programming"
          : classId === 2
            ? "Data Structures"
            : classId === 3
              ? "Calculus I"
              : "Quantum Mechanics I",
      courseCode: classId === 4 ? 301 : classId === 3 ? 101 : classId === 2 ? 201 : 101,
      semester: classId === 4 ? "SPRING" : "FALL",
      year: 2026,
      instructorName: classId === 4 ? "Dr. Niels Bohr" : classId === 3 ? "Dr. Ada Lovelace" : "Dr. Alan Smith",
    },
    eligibility: {
      canReview,
      gradePosted,
      alreadyReviewed,
      reason: gradePosted
        ? "Review is disabled because your grade has already been posted for this class."
        : alreadyReviewed
          ? "You already submitted a review for this class."
          : null,
    },
  };
}

export async function submitReview(req: SubmitReviewRequest): Promise<SubmitReviewResult> {
  const res = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ classId: req.classId, stars: req.stars, text: req.text }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `Review submission failed (${res.status})`);
  }
  return res.json() as Promise<SubmitReviewResult>;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

