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
  await sleep(400);
  const tabooCount = countTaboo(req.text);
  if (tabooCount >= 3) {
    return {
      status: "BLOCKED",
      reviewId: null,
      finalText: null,
      warningsIssued: 2,
      message: "Review blocked. 2 warnings issued.",
    };
  }
  if (tabooCount >= 1) {
    return {
      status: "PUBLISHED_MASKED",
      reviewId: Math.floor(Math.random() * 90000) + 10000,
      finalText: maskTaboo(req.text),
      warningsIssued: 1,
      masked: true,
    };
  }
  return {
    status: "PUBLISHED",
    reviewId: Math.floor(Math.random() * 90000) + 10000,
    finalText: req.text,
    warningsIssued: 0,
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

