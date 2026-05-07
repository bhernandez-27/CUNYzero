import { cookies } from "next/headers";

export type UserRole = "student" | "instructor" | "registrar";

export type SessionUser = {
  id: string;
  name: string;
  role: UserRole;
};

const COOKIE = "college0_user";

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SessionUser>;
    if (!parsed.role || !parsed.name) return null;
    return { id: parsed.id ?? "", name: parsed.name, role: parsed.role };
  } catch {
    return null;
  }
}
