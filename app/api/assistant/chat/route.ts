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
    finishReason?: string;
  }[];
};

// ==============================
// ENV HELPERS
// ==============================
function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("Missing GEMINI_API_KEY env variable");
  return key;
}

function getGeminiModel(): string {
  return (process.env.GEMINI_MODEL?.trim() || "gemini-3-flash-preview").replace(
    /^models\//,
    ""
  );
}

const EMBEDDING_MODEL = "gemini-embedding-2";
const TOP_K = 8; // more sources now, so fetch more candidates

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
  if (!res.ok) {
    const detail = await res.text().catch(() => "(no body)");
    throw new Error(`Embedding API error ${res.status}: ${detail}`);
  }
  const data = await res.json();
  if (!Array.isArray(data?.embedding?.values))
    throw new Error("Embedding API returned unexpected shape");
  return data.embedding.values as number[];
}

// ==============================
// VECTOR SEARCH — role-gated, full schema
//
// VISITOR:  public-safe tables only
//           course, department, major, semester, class (no student/grades/complaints)
//
// STUDENT:  all of the above + their own enrollment/grade context
//           course, class, department, major, semester,
//           enrollment, review, major_required_course, class_day_met
//
// INSTRUCTOR: everything students see + roster/complaint/warning context
//           all student tables + student, complaint, warning,
//           instructor_suspension (their own), review
// ==============================
async function vectorSearch(
  role: ChatRole,
  embedding: number[]
): Promise<ContextRow[]> {
  const pgVec = `[${embedding.join(",")}]`;

  // ── VISITOR ────────────────────────────────────────────────────────────────
  if (role === "visitor") {
    const { rows } = await db.query<ContextRow>(
      `SELECT source, label, detail, distance FROM (

        SELECT 'course' AS source,
               name AS label,
               description AS detail,
               embedding <-> $1::vector AS distance
        FROM course

        UNION ALL

        SELECT 'department' AS source,
               name AS label,
               department_code AS detail,
               embedding <-> $1::vector AS distance
        FROM department

        UNION ALL

        SELECT 'major' AS source,
               name AS label,
               NULL AS detail,
               embedding <-> $1::vector AS distance
        FROM major

        UNION ALL

        SELECT 'semester' AS source,
               CONCAT(semester, ' ', year) AS label,
               NULL AS detail,
               embedding <-> $1::vector AS distance
        FROM semester

        UNION ALL

        SELECT 'class' AS source,
               c.name AS label,
               cl.description AS detail,
               cl.embedding <-> $1::vector AS distance
        FROM class cl
        JOIN course c ON c.id = cl.course_id

      ) t
      ORDER BY distance
      LIMIT $2`,
      [pgVec, TOP_K]
    );
    return rows;
  }

  // ── STUDENT ────────────────────────────────────────────────────────────────
  if (role === "student") {
    const { rows } = await db.query<ContextRow>(
      `SELECT source, label, detail, distance FROM (

        SELECT 'course' AS source,
               name AS label,
               description AS detail,
               embedding <-> $1::vector AS distance
        FROM course

        UNION ALL

        SELECT 'class' AS source,
               c.name AS label,
               cl.description AS detail,
               cl.embedding <-> $1::vector AS distance
        FROM class cl
        JOIN course c ON c.id = cl.course_id

        UNION ALL

        SELECT 'department' AS source,
               name AS label,
               department_code AS detail,
               embedding <-> $1::vector AS distance
        FROM department

        UNION ALL

        SELECT 'major' AS source,
               name AS label,
               NULL AS detail,
               embedding <-> $1::vector AS distance
        FROM major

        UNION ALL

        SELECT 'semester' AS source,
               CONCAT(semester, ' ', year) AS label,
               NULL AS detail,
               embedding <-> $1::vector AS distance
        FROM semester

        UNION ALL

        SELECT 'enrollment' AS source,
               CONCAT(s.name, ' in ', c.name) AS label,
               CONCAT('status: ', e.status,
                      CASE WHEN e.letter_grade IS NOT NULL
                           THEN CONCAT(', grade: ', e.letter_grade) ELSE '' END) AS detail,
               e.embedding <-> $1::vector AS distance
        FROM enrollment e
        JOIN student s ON s.id = e.student_id
        JOIN class cl ON cl.id = e.class_id
        JOIN course c ON c.id = cl.course_id

        UNION ALL

        SELECT 'class_schedule' AS source,
               CONCAT(c.name, ' on ', cdm.day) AS label,
               CONCAT(cdm.start_time, ' - ', cdm.end_time, ' @ ', cdm.location) AS detail,
               cdm.embedding <-> $1::vector AS distance
        FROM class_day_met cdm
        JOIN class cl ON cl.id = cdm.class_id
        JOIN course c ON c.id = cl.course_id

        UNION ALL

        SELECT 'major_requirement' AS source,
               CONCAT(m.name, ' requires ', co.name) AS label,
               CONCAT('minimum grade: ', mrc.minimum_grade) AS detail,
               mrc.embedding <-> $1::vector AS distance
        FROM major_required_course mrc
        JOIN major m ON m.id = mrc.major_id
        JOIN course co ON co.id = mrc.course_id

        UNION ALL

        SELECT 'review' AS source,
               CONCAT(c.name, ' review') AS label,
               CONCAT(r.stars, '/5 stars — ', LEFT(r.text_content, 200)) AS detail,
               r.embedding <-> $1::vector AS distance
        FROM review r
        JOIN class cl ON cl.id = r.class_id
        JOIN course c ON c.id = cl.course_id

      ) t
      ORDER BY distance
      LIMIT $2`,
      [pgVec, TOP_K]
    );
    return rows;
  }

  // ── INSTRUCTOR ─────────────────────────────────────────────────────────────
  const { rows } = await db.query<ContextRow>(
    `SELECT source, label, detail, distance FROM (

      SELECT 'course' AS source,
             name AS label,
             description AS detail,
             embedding <-> $1::vector AS distance
      FROM course

      UNION ALL

      SELECT 'class' AS source,
             c.name AS label,
             cl.description AS detail,
             cl.embedding <-> $1::vector AS distance
      FROM class cl
      JOIN course c ON c.id = cl.course_id

      UNION ALL

      SELECT 'department' AS source,
             name AS label,
             department_code AS detail,
             embedding <-> $1::vector AS distance
      FROM department

      UNION ALL

      SELECT 'major' AS source,
             name AS label,
             NULL AS detail,
             embedding <-> $1::vector AS distance
      FROM major

      UNION ALL

      SELECT 'semester' AS source,
             CONCAT(semester, ' ', year) AS label,
             NULL AS detail,
             embedding <-> $1::vector AS distance
      FROM semester

      UNION ALL

      SELECT 'student' AS source,
             s.name AS label,
             CONCAT('email: ', s.email, ', gpa: ', s.gpa) AS detail,
             s.embedding <-> $1::vector AS distance
      FROM student s

      UNION ALL

      SELECT 'enrollment' AS source,
             CONCAT(s.name, ' in ', c.name) AS label,
             CONCAT('status: ', e.status,
                    CASE WHEN e.letter_grade IS NOT NULL
                         THEN CONCAT(', grade: ', e.letter_grade) ELSE '' END) AS detail,
             e.embedding <-> $1::vector AS distance
      FROM enrollment e
      JOIN student s ON s.id = e.student_id
      JOIN class cl ON cl.id = e.class_id
      JOIN course c ON c.id = cl.course_id

      UNION ALL

      SELECT 'class_schedule' AS source,
             CONCAT(c.name, ' on ', cdm.day) AS label,
             CONCAT(cdm.start_time, ' - ', cdm.end_time, ' @ ', cdm.location) AS detail,
             cdm.embedding <-> $1::vector AS distance
      FROM class_day_met cdm
      JOIN class cl ON cl.id = cdm.class_id
      JOIN course c ON c.id = cl.course_id

      UNION ALL

      SELECT 'major_requirement' AS source,
             CONCAT(m.name, ' requires ', co.name) AS label,
             CONCAT('minimum grade: ', mrc.minimum_grade) AS detail,
             mrc.embedding <-> $1::vector AS distance
      FROM major_required_course mrc
      JOIN major m ON m.id = mrc.major_id
      JOIN course co ON co.id = mrc.course_id

      UNION ALL

      SELECT 'review' AS source,
             CONCAT(c.name, ' review') AS label,
             CONCAT(r.stars, '/5 stars — ', LEFT(r.text_content, 200)) AS detail,
             r.embedding <-> $1::vector AS distance
      FROM review r
      JOIN class cl ON cl.id = r.class_id
      JOIN course c ON c.id = cl.course_id

      UNION ALL

      SELECT 'complaint' AS source,
             CONCAT('complaint #', comp.id) AS label,
             comp.description AS detail,
             comp.embedding <-> $1::vector AS distance
      FROM complaint comp

      UNION ALL

      SELECT 'warning' AS source,
             CONCAT('warning for user #', w.user_id) AS label,
             w.description AS detail,
             w.embedding <-> $1::vector AS distance
      FROM warning w

      UNION ALL

      SELECT 'instructor_suspension' AS source,
             CONCAT('suspension: ', ins.suspension_semester, ' ', ins.suspension_year) AS label,
             ins.reason AS detail,
             ins.embedding <-> $1::vector AS distance
      FROM instructor_suspension ins

    ) t
    ORDER BY distance
    LIMIT $2`,
    [pgVec, TOP_K]
  );
  return rows;
}

// ==============================
// ROLE RULES
// ==============================
function roleRules(role: ChatRole): string {
  switch (role) {
    case "visitor":
      return [
        "You are in VISITOR mode.",
        "- Only discuss publicly available academic information.",
        "- You have access to: courses, departments, majors, semesters, and class listings.",
        "- Never reveal student records, grades, complaints, or warnings.",
        "- Politely refuse any sensitive requests.",
      ].join("\n");
    case "student":
      return [
        "You are in STUDENT mode.",
        "- You have access to: courses, classes, departments, majors, semesters, enrollments, schedules, major requirements, and course reviews.",
        "- Never invent grades, class schedules, or enrollment status.",
        "- Do not reveal other students' personal information.",
      ].join("\n");
    case "instructor":
      return [
        "You are in INSTRUCTOR mode.",
        "- You have access to: all academic data, student roster, enrollment records, complaints, warnings, and suspensions.",
        "- Never fabricate roster data, grades, or disciplinary records.",
        "- Handle student data with discretion.",
      ].join("\n");
  }
}

// ==============================
// PROMPT BUILDER
// ==============================
function buildPrompt(
  role: ChatRole,
  message: string,
  context: ContextRow[]
): string {
  const contextBlock =
    context.length > 0
      ? context
          .map((r) => `- [${r.source}] ${r.label}${r.detail ? `: ${r.detail}` : ""}`)
          .join("\n")
      : "No relevant context found.";

  return [
    "You are College0 AI, a helpful academic assistant.",
    "",
    roleRules(role),
    "",
    "## Retrieved context",
    contextBlock,
    "",
    `## User message\n${message}`,
  ].join("\n");
}

// ==============================
// ROUTE HANDLER — streaming SSE
// ==============================
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.message !== "string" || !body.message.trim()) {
    return new Response(JSON.stringify({ error: "invalid_message" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const message: string = body.message.trim();
  const safeRole: ChatRole =
    body.role === "instructor"
      ? "instructor"
      : body.role === "visitor"
      ? "visitor"
      : "student";

  // 1. Embed + RAG
  let prompt: string;
  let contextUsed: number;
  try {
    const embedding = await embedText(message);
    const retrieved = await vectorSearch(safeRole, embedding);
    prompt = buildPrompt(safeRole, message, retrieved);
    contextUsed = retrieved.length;
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[chat/route] RAG error:", detail);
    return new Response(JSON.stringify({ error: "rag_error", detail }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Open Gemini streaming connection
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  let geminiRes: Response;
  try {
    geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
      }),
    });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[chat/route] Gemini fetch error:", detail);
    return new Response(
      JSON.stringify({ error: "gemini_unreachable", detail }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!geminiRes.ok) {
    const detail = await geminiRes.text().catch(() => "(no body)");
    console.error("[chat/route] Gemini error:", geminiRes.status, detail);
    return new Response(
      JSON.stringify({ error: "gemini_error", detail }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3. Stream SSE back to client
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        const reader = geminiRes.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const json = trimmed.slice(5).trim();
            if (!json || json === "[DONE]") continue;

            let chunk: GeminiStreamChunk;
            try { chunk = JSON.parse(json); } catch { continue; }

            const token =
              chunk.candidates?.[0]?.content?.parts
                ?.map((p) => p.text ?? "")
                .join("") ?? "";

            if (token) send({ token });
          }
        }

        send({ done: true, contextUsed, groundedInVectorDb: true });
      } catch (err: unknown) {
        const detail = err instanceof Error ? err.message : String(err);
        console.error("[chat/route] Stream read error:", detail);
        send({ error: detail });
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