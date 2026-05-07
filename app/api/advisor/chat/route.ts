import { NextResponse } from "next/server";
import type { AdvisorProfileDTO } from "@/app/api/advisor/route";

type GeminiPart = { text?: string };
type GeminiContent = { parts?: GeminiPart[] };
type GeminiCandidate = { content?: GeminiContent };
type GeminiResponse = { candidates?: GeminiCandidate[] };

function getGeminiApiKey(): string | null {
  const k = process.env.GEMINI_API_KEY?.trim();
  return k ? k : null;
}

function getGeminiModel(): string {
  return (process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash").replace(/^models\//, "");
}

function buildProfileContext(profile: AdvisorProfileDTO): string {
  const gpa = profile.cumulative_gpa != null ? profile.cumulative_gpa.toFixed(2) : "N/A";
  const lastSem = [...profile.semesters].find((s) => s.semester_gpa != null);
  const lastGpa = lastSem?.semester_gpa?.toFixed(2) ?? "N/A";
  const remaining = Math.max(0, 8 - profile.courses_completed);

  const riskLevel =
    profile.cumulative_gpa != null && profile.cumulative_gpa < 2.0
      ? "CRITICAL — GPA below 2.0, faces academic termination"
      : profile.cumulative_gpa != null && profile.cumulative_gpa < 2.25
        ? "WARNING — GPA between 2.0–2.25, mandatory Registrar interview required"
        : profile.honor_roll
          ? "Excellent — Honor Roll student"
          : "Good Standing";

  const currentCourses =
    profile.current_enrollments.length > 0
      ? profile.current_enrollments.map((c) => `${c.course_name} (${c.section_id})`).join(", ")
      : "None currently enrolled";

  const semHistory = profile.semesters
    .filter((s) => s.semester_gpa != null)
    .map((s) => `${s.semester} ${s.year}: ${s.semester_gpa!.toFixed(2)}`)
    .join(", ");

  return [
    "=== Student Academic Profile ===",
    `Cumulative GPA: ${gpa} / 4.0`,
    `Last Semester GPA: ${lastGpa}`,
    `GPA History: ${semHistory || "No completed semesters yet"}`,
    `Courses Completed: ${profile.courses_completed} / 8 required`,
    `Courses Remaining for Graduation: ${remaining}`,
    `Active Warnings: ${profile.warning_count} (3 = suspension)`,
    `Honor Roll: ${profile.honor_roll ? "Yes" : "No"}`,
    `Academic Risk: ${riskLevel}`,
    `Current Enrollments: ${currentCourses}`,
    "================================",
  ].join("\n");
}

export async function POST(req: Request) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "gemini_key_missing", message: "Set GEMINI_API_KEY in .env.local." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Request body must be JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body", message: "Expected a JSON object." }, { status: 400 });
  }

  const { message, profile } = body as Record<string, unknown>;
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json(
      { error: "validation_error", message: "message must be a non-empty string." },
      { status: 400 },
    );
  }

  const profileContext = profile
    ? buildProfileContext(profile as AdvisorProfileDTO)
    : "No profile data available.";

  const prompt = [
    "You are College0's AI Academic Advisor. You provide personalized academic guidance based on each student's actual academic record.",
    "Be specific — always reference the student's real GPA, warning count, and course progress from the profile below.",
    "Do not give generic advice. Every recommendation must be grounded in this student's data.",
    "",
    profileContext,
    "",
    "Guidelines:",
    "- If cumulative GPA < 2.0: urgently warn about academic termination risk.",
    "- If GPA between 2.0–2.25: remind about mandatory Registrar interview.",
    "- If courses_completed >= 6: mention graduation is within reach and advise on remaining requirements.",
    "- If honor_roll is true: acknowledge the achievement and encourage maintaining it.",
    "- Keep responses focused, practical, and under 300 words.",
    "",
    `Student question: ${message.trim()}`,
  ].join("\n");

  const model = getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 25_000);
    upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
  } catch {
    return NextResponse.json(
      { error: "gemini_unreachable", message: "Could not reach the AI service. Try again." },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: "gemini_error", message: "AI service returned an error.", details: text.slice(0, 2000) },
      { status: 502 },
    );
  }

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    return NextResponse.json(
      { error: "gemini_bad_response", message: "AI response was not valid JSON." },
      { status: 502 },
    );
  }

  const d = data as GeminiResponse;
  const reply = (d.candidates?.[0]?.content?.parts ?? [])
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();

  if (!reply) {
    return NextResponse.json(
      { error: "gemini_empty", message: "AI returned an empty response." },
      { status: 502 },
    );
  }

  return NextResponse.json({ reply, usedLlmFallback: true, groundedInVectorDb: false });
}
