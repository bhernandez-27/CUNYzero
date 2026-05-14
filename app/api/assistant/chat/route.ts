import db from "@/lib/db";

// ==============================
// TYPES
// ==============================
type ChatRole = "student" | "instructor" | "visitor";

type ContextRow = {
  source: string;
  label: string;
  detail: string | null;
  distance: number;
};

type GeminiStreamChunk = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
};

// ==============================
// CONFIG
// ==============================
const EMBEDDING_MODEL = "gemini-embedding-2";
const TOP_K = 10;
const RAG_DISTANCE_THRESHOLD = 0.35; // tune this

// ==============================
// ENV
// ==============================
function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("Missing GEMINI_API_KEY env variable");
  return key;
}

function getGeminiModel(): string {
  return (process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash").replace(/^models\//, "");
}

// ==============================
// EMBEDDINGS
// ==============================
async function embedText(text: string): Promise<number[]> {
  const apiKey = getGeminiApiKey();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    }
  );

  if (!res.ok) throw new Error(await res.text());

  const data = await res.json();
  return data.embedding.values;
}

// ==============================
// RAG QUALITY CHECK
// ==============================
function isGoodRag(rows: ContextRow[]): boolean {
  if (!rows.length) return false;

  // optional: ignore weak matches
  return rows[0].distance <= RAG_DISTANCE_THRESHOLD;
}

// ==============================
// VECTOR SEARCH
// ==============================
async function vectorSearch(role: ChatRole, embedding: number[]): Promise<ContextRow[]> {
  const pgVec = `[${embedding.join(",")}]`;

  const { rows } = await db.query<ContextRow>(
    `
    SELECT source, label, detail, distance FROM (
      SELECT 'course' AS source, name AS label, description AS detail, embedding <-> $1::vector AS distance FROM course
      UNION ALL
      SELECT 'department', name, department_code, embedding <-> $1::vector FROM department
      UNION ALL
      SELECT 'major', name, NULL, embedding <-> $1::vector FROM major
    ) t
    ORDER BY distance
    LIMIT $2
    `,
    [pgVec, TOP_K]
  );

  return rows;
}



// ==============================
// PROMPT BUILDER
// ==============================

function buildRagPrompt(role: ChatRole, message: string, context: ContextRow[]): string {
  const contextBlock = context
    .map(r => `- [${r.source}] ${r.label}${r.detail ? `: ${r.detail}` : ""}`)
    .join("\n");

  return `
You are College0 AI.

You MUST answer using ONLY the retrieved context below if it contains the answer.
If the context does not contain the answer, answer generally using your general knowledge.

## Retrieved context
${contextBlock}

## User message
${message}
  `.trim();
}

function buildFallbackPrompt(role: ChatRole, message: string): string {
  return `
You are College0 AI.

No relevant database context was found.
Answer the question using general knowledge.

## User message
${message}
  `.trim();
}

function buildPrompt(role: ChatRole, message: string, context: ContextRow[]): string {
  const contextBlock =
    context.length > 0
      ? context.map(r => `- [${r.source}] ${r.label}${r.detail ? `: ${r.detail}` : ""}`).join("\n")
      : "No relevant context found.";

  return `
You are College0 AI.

## Retrieved context
${contextBlock}

## User message
${message}
  `.trim();
}

// ==============================
// ROUTE
// ==============================
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body?.message) {
    return new Response(JSON.stringify({ error: "invalid_message" }), { status: 400 });
  }

  const message = body.message.trim();
  const role: ChatRole = body.role ?? "student";

  let prompt: string;
  let usedRag = false;

  try {
    // ======================
    // 1. EMBED
    // ======================
    const embedding = await embedText(message);

    // ======================
    // 2. VECTOR SEARCH
    // ======================
    const retrieved = await vectorSearch(role, embedding);

    // ======================
    // 3. DECIDE MODE
    // ======================
    if (isGoodRag(retrieved)) {
      prompt = buildRagPrompt(role, message, retrieved);
      usedRag = true;
    } else {
      prompt = buildFallbackPrompt(role, message);
    }
  } catch (err) {
    console.warn("[RAG failed]", err);
    prompt = buildFallbackPrompt(role, message);
  }

  // ======================
  // 4. CALL GEMINI
  // ======================
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const geminiRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });

  if (!geminiRes.ok) {
    return new Response(JSON.stringify({ error: "gemini_error" }), { status: 502 });
  }

  // ======================
  // 5. STREAM
  // ======================
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      const reader = geminiRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;

            const json = line.slice(5).trim();
            if (!json || json === "[DONE]") continue;

            const chunk: GeminiStreamChunk = JSON.parse(json);

            const token =
              chunk.candidates?.[0]?.content?.parts?.map(p => p.text ?? "").join("") ?? "";

            if (token) send({ token });
          }
        }

        send({
          done: true,
          usedRag,
        });
      } catch (e) {
        send({ error: String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}