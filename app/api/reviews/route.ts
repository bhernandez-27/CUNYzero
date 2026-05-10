import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import { getSession } from "@/lib/auth/session";
import type { SubmitReviewResult } from "@/lib/reviews/types";

/*
 * Python endpoint (already implemented in main.py):
 *   POST {AUTH_PYTHON_BASE_URL}/submit-review
 *   Body: { student_id: int, class_id: int, text_content: string, stars: int }
 *   Returns:
 *     { status: "Success", final_text: string, warnings: 0 | 1 }  → PUBLISHED or PUBLISHED_MASKED
 *     { status: "Rejected", message: string }                      → BLOCKED
 */

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Request body must be JSON." }, { status: 400 });
  }

  const { classId, stars, text } = (body as Record<string, unknown>) ?? {};

  if (!classId || typeof stars !== "number" || !text) {
    return NextResponse.json(
      { error: "missing_field", message: "classId, stars, and text are required." },
      { status: 400 },
    );
  }

  if (typeof stars !== "number" || stars < 1 || stars > 5) {
    return NextResponse.json(
      { error: "invalid_stars", message: "Stars must be between 1 and 5." },
      { status: 400 },
    );
  }

  const session = await getSession();
  const studentId = session?.id ?? "1";

  const base = getAuthPythonBaseUrl();

  if (!base) {
    // Dev fallback: run the same mock logic as before
    return NextResponse.json(getMockResult(String(text)));
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/submit-review`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        student_id: Number(studentId),
        class_id: Number(classId),
        text_content: text,
        stars: Number(stars),
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
  } catch {
    console.warn("[reviews] Python unreachable, using mock result");
    return NextResponse.json(getMockResult(String(text)));
  }

  const data = (await upstream.json()) as {
    status: "Success" | "Rejected";
    final_text?: string;
    warnings?: number;
    message?: string;
  };

  // Map Python response → SubmitReviewResult
  const result = mapPythonResponse(data, String(text));
  return NextResponse.json(result);
}

/** Map Python's response shape to the typed SubmitReviewResult the frontend expects. */
function mapPythonResponse(
  data: { status: string; final_text?: string; warnings?: number; message?: string },
  originalText: string,
): SubmitReviewResult {
  if (data.status === "Rejected") {
    return {
      status: "BLOCKED",
      reviewId: null,
      finalText: null,
      warningsIssued: 2,
      message: data.message ?? "Review blocked due to excessive taboo words.",
    };
  }

  const warnings = data.warnings ?? 0;
  const finalText = data.final_text ?? originalText;
  const reviewId = Math.floor(Math.random() * 90_000) + 10_000;

  if (warnings >= 1) {
    return {
      status: "PUBLISHED_MASKED",
      reviewId,
      finalText,
      warningsIssued: 1,
      masked: true,
    };
  }

  return {
    status: "PUBLISHED",
    reviewId,
    finalText,
    warningsIssued: 0,
  };
}

/** Dev-mode fallback using a small hardcoded taboo list. */
function getMockResult(text: string): SubmitReviewResult {
  const TABOO = ["terrible", "awful", "hate"];
  const lower = text.toLowerCase();
  let count = 0;
  for (const w of TABOO) {
    const re = new RegExp(`\\b${w}\\b`, "g");
    count += (lower.match(re) ?? []).length;
  }

  const reviewId = Math.floor(Math.random() * 90_000) + 10_000;

  if (count >= 3) {
    return { status: "BLOCKED", reviewId: null, finalText: null, warningsIssued: 2, message: "Review blocked. 2 warnings issued." };
  }
  if (count >= 1) {
    let masked = text;
    for (const w of TABOO) {
      masked = masked.replace(new RegExp(`\\b${w}\\b`, "gi"), (m) => "*".repeat(m.length));
    }
    return { status: "PUBLISHED_MASKED", reviewId, finalText: masked, warningsIssued: 1, masked: true };
  }
  return { status: "PUBLISHED", reviewId, finalText: text, warningsIssued: 0 };
}
