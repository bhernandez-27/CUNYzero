import { NextResponse } from "next/server";
import { proxyJsonToPython } from "@/lib/auth/proxyUpstream";

export async function POST(req: Request) {
  let extra: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text.trim()) {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        extra = parsed as Record<string, unknown>;
      }
    }
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "If a body is sent, it must be valid JSON." },
      { status: 400 },
    );
  }

  const res = await proxyJsonToPython("/auth/logout", Object.keys(extra).length ? extra : {}, req);
  // Clear our session cookie regardless of Python's response.
  res.cookies.set("college0_user", "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 0,
  });
  return res;
}
