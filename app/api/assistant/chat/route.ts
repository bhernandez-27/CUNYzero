import { NextResponse } from "next/server";

type ChatRole = "student" | "instructor";

type GeminiPart = { text?: string };
type GeminiContent = { parts?: GeminiPart[] };
type GeminiCandidate = { content?: GeminiContent };
type GeminiResponse = { candidates?: GeminiCandidate[] };

function getGeminiApiKey(): string | null {
  const k = process.env.GEMINI_API_KEY?.trim();
  return k ? k : null;
}

function getGeminiModel(): string {
  // Default to a model that is available for generateContent on v1beta.
  // Allow override via GEMINI_MODEL in .env.local.
  return (process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash").replace(/^models\//, "");
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

  const { message, role } = body as Record<string, unknown>;
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "validation_error", message: "message must be a non-empty string." }, { status: 400 });
  }

  const roleStr: ChatRole = role === "instructor" ? "instructor" : "student";
  const prompt = [
    `You are College0's AI assistant.`,
    `User role: ${roleStr}.`,
    `If you are unsure or missing College0-specific facts, say so briefly and ask a clarifying question.`,
    "",
    message.trim(),
  ].join("\n");

  const model = getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15_000);
    upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 512,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
  } catch {
    return NextResponse.json(
      { error: "gemini_unreachable", message: "Could not reach Gemini. Try again." },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      {
        error: "gemini_error",
        message: "Gemini returned an error.",
        status: upstream.status,
        details: text.slice(0, 2000),
      },
      { status: 502 },
    );
  }

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    return NextResponse.json(
      { error: "gemini_bad_response", message: "Gemini response was not valid JSON." },
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
      { error: "gemini_empty", message: "Gemini returned an empty response." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    reply,
    groundedInVectorDb: false,
    usedLlmFallback: true,
  });
}

