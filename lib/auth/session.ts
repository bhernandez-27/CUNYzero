import { cookies } from "next/headers";

export type UserRole = "student" | "instructor" | "registrar" | "applicant";

export type ApplicantInfo = {
  application_id: string;
  kind: "student" | "instructor";
  status: "PENDING" | "REJECTED";
  applied_email: string;
  prior_gpa?: number | null;
};

export type SessionUser = {
  id: string;
  name: string;
  role: UserRole;
  applicant?: ApplicantInfo;
};

const COOKIE = "college0_user";

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SessionUser>;
    if (!parsed.role || !parsed.name) return null;
    return {
      id: parsed.id ?? "",
      name: parsed.name,
      role: parsed.role,
      applicant: parsed.applicant,
    };
  } catch {
    return null;
  }
}
