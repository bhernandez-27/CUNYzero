import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";

/*
 * Python must implement:
 *
 * GET {AUTH_PYTHON_BASE_URL}/registrar/taboo
 *   Success (200): { words: string[] }
 *
 * POST {AUTH_PYTHON_BASE_URL}/registrar/taboo
 *   Body: { word: string }
 *   Success (201): { words: string[] }   (full updated list)
 *   Duplicate (409): { error: "DUPLICATE"; message: string }
 *
 * DELETE {AUTH_PYTHON_BASE_URL}/registrar/taboo
 *   Body: { word: string }
 *   Success (200): { words: string[] }   (full updated list)
 *   Not found (404): { error: "NOT_FOUND"; message: string }
 *
 * Business rules:
 *   - Words are case-insensitive during review scanning.
 *   - The list is global and shared across all reviews.
 */

export type TabooWordsDTO = {
  words: string[];
};

export async function GET(req: Request) {
  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json(getMockWords());
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/registrar/taboo`, { headers, signal: controller.signal });
    clearTimeout(t);
  } catch {
    console.warn("[registrar/taboo] Python unreachable, using mock data");
    return NextResponse.json(getMockWords());
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Request body must be JSON." }, { status: 400 });
  }

  const word = typeof (body as Record<string, unknown>).word === "string"
    ? ((body as Record<string, unknown>).word as string).trim().toLowerCase()
    : "";

  if (!word) {
    return NextResponse.json({ error: "missing_field", message: "word is required." }, { status: 400 });
  }

  const base = getAuthPythonBaseUrl();

  if (!base) {
    const mock = getMockWords();
    if (!mock.words.includes(word)) mock.words.push(word);
    return NextResponse.json(mock, { status: 201 });
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/registrar/taboo`, {
      method: "POST",
      headers,
      body: JSON.stringify({ word }),
      signal: controller.signal,
    });
    clearTimeout(t);
  } catch {
    return NextResponse.json(
      { error: "upstream_unreachable", message: "Could not reach the backend. Try again." },
      { status: 502 },
    );
  }

  const responseBody = await upstream.text();
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function DELETE(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Request body must be JSON." }, { status: 400 });
  }

  const word = typeof (body as Record<string, unknown>).word === "string"
    ? ((body as Record<string, unknown>).word as string).trim().toLowerCase()
    : "";

  if (!word) {
    return NextResponse.json({ error: "missing_field", message: "word is required." }, { status: 400 });
  }

  const base = getAuthPythonBaseUrl();

  if (!base) {
    const mock = getMockWords();
    mock.words = mock.words.filter((w) => w !== word);
    return NextResponse.json(mock);
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/registrar/taboo`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ word }),
      signal: controller.signal,
    });
    clearTimeout(t);
  } catch {
    return NextResponse.json(
      { error: "upstream_unreachable", message: "Could not reach the backend. Try again." },
      { status: 502 },
    );
  }

  const responseBody = await upstream.text();
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

function getMockWords(): TabooWordsDTO {
  return { words: ["stupid", "idiot", "terrible", "awful", "hate"] };
}
