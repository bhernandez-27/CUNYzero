import type { Metadata } from "next";
import ChatPanel from "@/components/ai/ChatPanel";

export const metadata: Metadata = {
  title: "AI Q&A (Visitor) | College0",
  description:
    "Ask general questions about College0 without signing in. Personalized academic data is not available in this mode.",
};

export default function VisitorAiPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 pb-20">
      <header className="max-w-xl">
        <p className="text-sm font-medium text-[#F07E62]">College0 · Visitor</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">AI Q&amp;A</h1>
        <p className="mt-4 text-sm text-neutral-600 leading-relaxed">
          You&apos;re browsing as a visitor. This assistant answers{" "}
          <strong className="font-semibold text-neutral-800">general questions only</strong> — program overview, how
          applications and registration work at a high level, and public-facing policies. It cannot see your grades,
          schedule, or anyone else&apos;s private information. Sign in as a student or instructor for role-specific help.
        </p>
      </header>

      <div className="mt-8">
        <ChatPanel role="visitor" />
      </div>

      <p className="mt-8 text-xs text-neutral-500 leading-relaxed">
        Answers may use a college knowledge base when available; otherwise the model answers generally and you&apos;ll see
        an accuracy notice — per College0 AI requirements.
      </p>
    </div>
  );
}
