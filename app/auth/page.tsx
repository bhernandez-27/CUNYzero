import type { Metadata } from "next";
import { Suspense } from "react";
import AuthPageClient from "@/components/auth/AuthPageClient";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create a College0 account.",
};

function AuthFallback() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center text-sm text-neutral-500">Loading…</div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <AuthPageClient />
    </Suspense>
  );
}
