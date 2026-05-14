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
  return (process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite").replace(/^models\//, "");
}

/**
 * Schema-aligned profile context builder
 * Uses ONLY fields that are actually supported by your DB model:
 * - student.gpa
 * - enrollment data (via API DTO)
 * - warning table
 * - honor roll table (derived in API layer)
 */
function buildProfileContext(profile: AdvisorProfileDTO): string {
  const gpa = profile.cumulative_gpa ?? profile.student_gpa ?? null;

  const gpaDisplay = gpa != null ? gpa.toFixed(2) : "N/A";

  const warningCount = profile.warning_count ?? 0;

  const honorRoll = profile.honor_roll === true;

  const currentCourses =
    profile.current_enrollments?.length > 0
      ? profile.current_enrollments
          .map((c) => `${c.course_name} (section ${c.section_id})`)
          .join(", ")
      : "None";

  // DO NOT assume graduation requirement (not in schema)
  const creditsCompletedGuess =
    profile.current_enrollments?.reduce((sum, c) => sum + (c.credits ?? 0), 0) ?? 0;

  const riskLevel =
    gpa != null && gpa < 2.0
      ? "CRITICAL (GPA < 2.0)"
      : gpa != null && gpa < 2.25
        ? "WARNING (2.0–2.25)"
        : honorRoll
          ? "GOOD STANDING (Honor Roll)"
          : "GOOD STANDING";

  return [
    "=== Student Academic Profile (DB-aligned) ===",
    `Student GPA (student.gpa / computed): ${gpaDisplay}`,
    `Active Warnings: ${warningCount}`,
    `Honor Roll: ${honorRoll ? "Yes" : "No"}`,
    `Current Enrollments: ${currentCourses}`,
    `Approx. Current Credits: ${creditsCompletedGuess}`,
    `Academic Status: ${riskLevel}`,
    "NOTE: Semester history is not guaranteed to be schema-backed in this API layer.",
    "============================================",
  ].join("\n");
}

export async function POST(req: Request) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "gemini_key_missing" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { message, profile } = body as Record<string, unknown>;

  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json(
      { error: "invalid_message" },
      { status: 400 },
    );
  }

  const profileContext = profile
    ? buildProfileContext(profile as AdvisorProfileDTO)
    : "No profile available.";

  const prompt = [
    "You are an AI Academic Advisor for a university system.",
    "You MUST base advice strictly on the provided student database profile.",
    "Do NOT assume missing data like graduation requirements or full transcript history.",
    "",
    profileContext,
    "",
    "Rules:",
    "- If GPA < 2.0: warn about academic risk.",
    "- If GPA 2.0–2.25: mention probation risk.",
    "- If honor_roll: acknowledge achievement.",
    "- Be precise, no generic advice.",
    "- Keep response under 300 words.",
    "",
    `Student question: ${message.trim()}`,
  ].join("\n");

  const model = getGeminiModel();
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let upstream: Response;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 25_000);

    upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 600,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(t);
  } catch {
    return NextResponse.json(
      { error: "gemini_unreachable" },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: "gemini_error", details: text.slice(0, 2000) },
      { status: 502 },
    );
  }

  const data = (await upstream.json()) as GeminiResponse;

  const reply = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();

  if (!reply) {
    return NextResponse.json(
      { error: "gemini_empty" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    reply,
    usedLlmFallback: true,
    groundedInVectorDb: false,
  });
}