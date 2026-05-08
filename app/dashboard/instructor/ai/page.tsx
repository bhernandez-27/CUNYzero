import type { Metadata } from "next";
import ChatPanel from "@/components/ai/ChatPanel";

export const metadata: Metadata = {
  title: "AI Q&A | College0",
  description: "Ask questions about your classes and enrolled students.",
};

export default function InstructorAiPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <div className="mx-auto max-w-3xl px-6 py-10 pb-20">
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
    </div>
  );
}
