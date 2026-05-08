import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import { getSession } from "@/lib/auth/session";
import type { StudentWarningsDTO } from "@/lib/warnings/types";

/*
 * Python must implement:
 *   GET {AUTH_PYTHON_BASE_URL}/warnings/student?student_id={id}
 *
 * Success (200): StudentWarningsDTO
 *   {
 *     student_id: string,
 *     warning_count: number,
 *     suspension_threshold: number,   // always 3
 *     suspended: boolean,
 *     warnings: [
 *       {
 *         warning_id: string,
 *         issued_at: string,           // ISO 8601
 *         reason: string,
 *         issued_by: string,
 *         source: "review" | "complaint" | "enrollment" | "graduation" | "grade" | "system" | "other"
 *       }
 *     ]
 *   }
 */
export async function GET(req: Request) {
  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json(getMockWarnings());
  }

  const session = await getSession();
  const studentId = session?.id ?? "";

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(
      `${base}/warnings/student?student_id=${encodeURIComponent(studentId)}`,
      { headers, signal: controller.signal },
    );
    clearTimeout(t);
  } catch {
    console.warn("[warnings/student] Python unreachable, using mock data");
    return NextResponse.json(getMockWarnings());
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

function getMockWarnings(): StudentWarningsDTO {
  return {
    student_id: "dev-001",
    warning_count: 1,
    suspension_threshold: 3,
    suspended: false,
    warnings: [
      {
        warning_id: "WRN-001",
        issued_at: "2025-11-14T10:22:00Z",
        reason: "Review contained 1–2 taboo words. Offending words were masked.",
        issued_by: "System (Taboo Filter)",
        source: "review",
      },
    ],
  };
}
