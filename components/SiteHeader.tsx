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
          <span>College0</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-neutral-700" aria-label="Primary">
          <Link href="/#program" className="hover:text-neutral-900 transition-colors">
            Program
          </Link>
          <Link href="/public" className="hover:text-neutral-900 transition-colors">
            Public dashboard
          </Link>
          <Link href="/apply" className="hover:text-neutral-900 transition-colors">
            Apply
          </Link>
          <Link href="/visitor-ai" className="hover:text-neutral-900 transition-colors">
            Visitor AI
          </Link>
          <Link href="/#how-it-works" className="hover:text-neutral-900 transition-colors">
            How it Works
          </Link>
          <Link href="/#contact" className="hover:text-neutral-900 transition-colors">
            Contact
          </Link>
        </nav>

        <details className="relative lg:hidden">
          <summary className="list-none cursor-pointer inline-flex items-center justify-center h-9 px-3 rounded-xl border border-black/10 bg-white text-sm font-semibold text-neutral-800 hover:bg-white/90 [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <nav
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl border border-black/10 bg-white shadow-lg py-2 text-sm font-medium text-neutral-800"
            aria-label="Mobile primary"
          >
            <Link href="/#program" className="block px-4 py-2.5 hover:bg-neutral-50">
              Program
            </Link>
            <Link href="/public" className="block px-4 py-2.5 hover:bg-neutral-50">
              Public dashboard
            </Link>
            <Link href="/apply" className="block px-4 py-2.5 hover:bg-neutral-50">
              Apply
            </Link>
            <Link href="/visitor-ai" className="block px-4 py-2.5 hover:bg-neutral-50">
              Visitor AI
            </Link>
            <Link href="/#how-it-works" className="block px-4 py-2.5 hover:bg-neutral-50">
              How it Works
            </Link>
            <Link href="/#contact" className="block px-4 py-2.5 hover:bg-neutral-50">
              Contact
            </Link>
          </nav>
        </details>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/public"
            className="hidden md:inline-flex text-sm font-semibold text-neutral-700 hover:text-neutral-900 transition"
          >
            Explore
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm hover:bg-white/80 transition"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}

