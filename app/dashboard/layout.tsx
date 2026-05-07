import { type ReactNode } from "react";
import { getSession } from "@/lib/auth/session";
import { RoleProvider } from "@/lib/auth/RoleContext";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  // Fallback so the dashboard still renders during development before auth is wired.
  const user = session ?? { id: "", name: "Dev User", role: "student" as const };

  return <RoleProvider user={user}>{children}</RoleProvider>;
}
