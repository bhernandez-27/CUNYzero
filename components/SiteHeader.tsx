"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteHeader() {
  const pathname = usePathname();
  if (pathname?.startsWith("/dashboard")) return null;

  return (
    <header className="sticky top-0 z-50 bg-[#F7F5F1]/80 backdrop-blur-md border-b border-black/5">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-grid place-items-center h-7 w-7 rounded-full bg-neutral-900 text-white">
            ✦
          </span>
          <span>Galaxy</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-700">
          <Link href="/dashboard" className="hover:text-neutral-900 transition-colors">
            Courses
          </Link>
          <Link href="/dashboard" className="hover:text-neutral-900 transition-colors">
            Instructor
          </Link>
          <Link href="/#how-it-works" className="hover:text-neutral-900 transition-colors">
            How it Works
          </Link>
          <Link href="/#contact" className="hover:text-neutral-900 transition-colors">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex text-sm font-semibold text-neutral-700 hover:text-neutral-900 transition"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm hover:bg-white/80 transition"
          >
            Join Now
          </Link>
        </div>
      </div>
    </header>
  );
}

