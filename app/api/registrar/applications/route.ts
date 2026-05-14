import { NextResponse } from "next/server";
import { getAuthPythonBaseUrl } from "@/lib/auth/proxyUpstream";

//specific data types for the applications
export type StudentApplicationDTO = {
  application_id: string;
  full_name: string;
  email: string;
  prior_gpa: number;
  phone?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  applied_at: string;
  type: "student";
};

export type InstructorApplicationDTO = {
  application_id: string;
  full_name: string;
  email: string;
  field_of_expertise: string;
  credentials_summary: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  applied_at: string;
  type: "instructor";
};

export type ApplicationsDTO = {
  students: StudentApplicationDTO[];
  instructors: InstructorApplicationDTO[];
};

export async function GET(req: Request) {
  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json(getMockApplications());
  }
  //Get the cookie from the request and attach to python
  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response; 
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/registrar/applications`, { headers, signal: controller.signal });
    clearTimeout(t);
  } catch {
    console.warn("[registrar/applications] Python unreachable, using mock data");
    return NextResponse.json(getMockApplications());
  }

  const body = await upstream.text(); //read python's response and then build a new response
  return new NextResponse(body, {
    status: upstream.status, 
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" }, 
  });
}

export async function PATCH(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Request body must be JSON." }, { status: 400 });
  }

  const { application_id, type, decision, justification } = (body as Record<string, unknown>) ?? {};

  if (!application_id || !type || !decision) {
    return NextResponse.json(
      { error: "missing_field", message: "application_id, type, and decision are required." },
      { status: 400 },
    );
  }
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return NextResponse.json(
      { error: "invalid_decision", message: "decision must be APPROVED or REJECTED." },
      { status: 400 },
    );
  }

  const base = getAuthPythonBaseUrl();

  if (!base) {
    return NextResponse.json({
      status: decision,
      message: `Application ${decision === "APPROVED" ? "approved" : "rejected"} successfully.`,
    });
  }

  const cookie = req.headers.get("cookie");
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    upstream = await fetch(`${base}/registrar/applications`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ application_id, type, decision, justification: justification ?? null }),
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

function getMockApplications(): ApplicationsDTO {
  return {
    students: [
      {
        application_id: "APP-S-001",
        full_name: "Maria Gonzalez",
        email: "maria.gonzalez@mail.com",
        prior_gpa: 3.7,
        status: "PENDING",
        applied_at: "2026-05-01T10:30:00Z",
        type: "student",
      },
      {
        application_id: "APP-S-002",
        full_name: "James Park",
        email: "james.park@mail.com",
        prior_gpa: 2.4,
        status: "PENDING",
        applied_at: "2026-05-02T14:15:00Z",
        type: "student",
      },
      {
        application_id: "APP-S-003",
        full_name: "Aisha Thompson",
        email: "aisha.t@mail.com",
        prior_gpa: 3.1,
        status: "PENDING",
        applied_at: "2026-05-03T09:00:00Z",
        type: "student",
      },
    ],
    instructors: [
      {
        application_id: "APP-I-001",
        full_name: "Dr. Robert Chen",
        email: "r.chen@mail.com",
        field_of_expertise: "Computer Science",
        credentials_summary:
          "PhD in CS from MIT, 10 years teaching experience in algorithms and data structures.",
        status: "PENDING",
        applied_at: "2026-05-01T08:00:00Z",
        type: "instructor",
      },
      {
        application_id: "APP-I-002",
        full_name: "Prof. Sandra Williams",
        email: "s.williams@mail.com",
        field_of_expertise: "Mathematics",
        credentials_summary:
          "MS in Applied Mathematics, specialized in linear algebra and calculus. 5 years adjunct faculty experience.",
        status: "PENDING",
        applied_at: "2026-05-04T11:45:00Z",
        type: "instructor",
      },
    ],
  };
}
