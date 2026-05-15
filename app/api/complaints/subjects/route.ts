import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";
import { getSession } from "@/lib/auth/session";

export type ComplaintSubject = { id: string; name: string };
export type ComplaintSubjectsDTO = {
  students: ComplaintSubject[];
  instructors: ComplaintSubject[];
};

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ students: [], instructors: [] });
  }

  const base = getAuthPythonBaseUrl();
  if (!base) {
    return NextResponse.json({ students: [], instructors: [] });
  }

  try {
    const res = await fetch(
      `${base}/complaints/subjects?user_id=${session.id}&role=${session.role}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      return NextResponse.json({ students: [], instructors: [] });
    }
    const data = (await res.json()) as ComplaintSubjectsDTO;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ students: [], instructors: [] });
  }
}
