import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PENDING_PATH = "/dashboard/pending";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const raw = request.cookies.get("college0_user")?.value;

  let role: string | undefined;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { role?: string };
      role = parsed.role;
    } catch {
      role = undefined;
    }
  }

  // Applicants: locked to /dashboard/pending. Anything else under /dashboard
  // (or accidental /auth visit) bounces back to the status page.
  if (role === "applicant") {
    if (pathname === PENDING_PATH) return NextResponse.next();
    if (pathname.startsWith("/dashboard") || pathname === "/auth") {
      return NextResponse.redirect(new URL(PENDING_PATH, request.url));
    }
    return NextResponse.next();
  }

  // Non-applicants visiting the pending page should leave it.
  if (pathname === PENDING_PATH) {
    if (role === "registrar") return NextResponse.redirect(new URL("/dashboard/registrar/applications", request.url));
    if (role === "instructor") return NextResponse.redirect(new URL("/dashboard/instructor", request.url));
    if (role === "student") return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth"],
};
