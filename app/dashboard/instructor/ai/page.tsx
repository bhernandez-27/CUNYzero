import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import ChatPanel from "@/components/ai/ChatPanel";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "AI Q&A | College0",
  description: "Ask questions about your classes and enrolled students.",
};

export default async function InstructorAiPage() {
  const session = await getSession();
  if (!session) redirect("/auth");
  if (session.role !== "instructor") redirect("/dashboard");

  return (
    <DashboardShell
      main={
        <div className="mx-auto max-w-3xl py-4 pb-20">
          <header className="max-w-xl">
            <p className="text-sm font-medium text-[#F07E62]">College0 · Instructor</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">AI Q&amp;A</h1>
            <p className="mt-4 text-sm text-neutral-600 leading-relaxed">
              Ask about students enrolled in your current class sections, grading policies, or
              college procedures. Answers are sourced from the college knowledge base first — if
              the local data doesn&apos;t cover it, a general AI responds and you&apos;ll see an
              accuracy notice.
            </p>
          </header>

          <div className="mt-8">
            <ChatPanel role="instructor" />
          </div>

          <p className="mt-8 text-xs text-neutral-500 leading-relaxed">
            Your questions are scoped to instructor-accessible information: your own class rosters
            and college-wide policies. You cannot query other instructors&apos; rosters or private
            student records outside your sections.
          </p>
        </div>
      }
    />
  );
}
