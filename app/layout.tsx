import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CollegeZero Dashboard",
  description: "Manage classes, instructors, and student data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased text-slate-900 selection:bg-blue-200 selection:text-blue-900`}
    >
      {/* THE METALLIC FIX:
        bg-gradient-to-br: Angles the light from top-left to bottom-right
        from-slate-50: The bright highlight where the "light" hits
        via-slate-200: The main silver body
        to-slate-300: The darker shadow corner
        bg-fixed: Keeps the metal sheet perfectly still while content scrolls over it
      */}
<body className="min-h-full flex flex-col bg-gradient-to-br from-white via-slate-350 to-slate-500 bg-fixed">        
        {/* Sleek Navigation Bar */}
        {/* Changed header to slate-200/60 to make it slightly more transparent over the metal! */}
        <header className="sticky top-0 z-50 bg-slate-200/60 backdrop-blur-md border-b border-white/20 transition-all shadow-sm">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            {/* Logo */}
            <div className="font-bold text-xl tracking-tight text-slate-800 drop-shadow-sm">
              <span className="text-blue-600">College</span>Zero
            </div>
            
            {/* Simple Nav Links */}
            <nav className="flex gap-6 text-sm font-medium text-slate-700">
              <a href="/" className="hover:text-blue-600 transition-colors">Dashboard</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Courses</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Students</a>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1">
          {children}
        </main>

        {/* Global Footer */}
        {/* Made the footer slightly transparent so the gradient bleeds through */}
        <footer className="py-8 mt-12 border-t border-slate-300/50 bg-slate-300/30 text-center">
          <p className="text-sm text-slate-600 font-medium tracking-wide">
            &copy; {new Date().getFullYear()} CollegeZero System. All rights reserved.
          </p>
        </footer>

      </body>
    </html>
  );
}