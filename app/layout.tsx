import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The metadata for the page
export const metadata: Metadata = {
  title: "College0",
  description: "AI-enabled online college program management system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased text-neutral-900 selection:bg-[#F07E62]/25 selection:text-neutral-900`}
    >
      <body className="min-h-full flex flex-col bg-[#F7F5F1]">
        <SiteHeader />

        {/* Main Content Area */}
        <main className="flex-1">
          {children}
        </main>

        {/* Global Footer */}
        <footer id="contact" className="py-10 border-t border-black/5">
          <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="text-sm text-neutral-600">
              <div className="font-semibold text-neutral-900">College0</div>
              <div className="mt-1">A single-window learning experience with AI support.</div>
            </div>
            <p className="text-sm text-neutral-600">
              &copy; {new Date().getFullYear()} College0. All rights reserved.
            </p>
          </div>
        </footer>

      </body>
    </html>
  );
}