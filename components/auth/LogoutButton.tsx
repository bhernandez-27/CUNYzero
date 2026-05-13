"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      router.push("/auth");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className={
        className ??
        "inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition disabled:opacity-60"
      }
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
