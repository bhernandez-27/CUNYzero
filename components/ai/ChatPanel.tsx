"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";

type ChatRole = "student" | "instructor" | "visitor";

type ChatMsg = {
  id: string;
  from: "user" | "assistant";
  text: string;
  groundedInVectorDb?: boolean;
  usedLlmFallback?: boolean;
  streaming?: boolean;
};

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRole(r: ChatRole | undefined): ChatRole {
  if (r === "instructor") return "instructor";
  if (r === "visitor") return "visitor";
  return "student";
}

function welcomeForRole(role: ChatRole): string {
  if (role === "visitor") {
    return "You're in visitor mode: I can share general information about College0 (programs, how to apply, semester lifecycle in broad terms). I can't access personal schedules, grades, rosters, or accounts — ask those after you sign in, or contact the Registrar.";
  }
  return "Ask me anything about College0. If I can't find it in local data yet, I'll answer generally and label it as potentially inaccurate.";
}

// ==============================
// TYPING INDICATOR
// ==============================
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-1.5">
        {[0, 160, 320].map((delay) => (
          <span
            key={delay}
            className="block w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: `${delay}ms`, animationDuration: "1s" }}
          />
        ))}
      </div>
    </div>
  );
}

// ==============================
// BLINKING CURSOR
// ==============================
function Cursor() {
  return (
    <span
      className="inline-block w-[2px] h-[1em] bg-slate-500 ml-[1px] align-middle animate-pulse"
      aria-hidden
    />
  );
}

// ==============================
// SEND ICON
// ==============================
function SendIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M1.724 1.053a.5.5 0 0 0-.714.545l1.403 4.85a.5.5 0 0 0 .397.354l5.69.948c.268.045.268.432 0 .477l-5.69.948a.5.5 0 0 0-.397.354L.91 14.4a.5.5 0 0 0 .714.545l13-6.5a.5.5 0 0 0 0-.892l-13-6.5Z" />
    </svg>
  );
}

// ==============================
// MARKDOWN BODY
// Only used for assistant messages. Scoped prose styles so they
// don't bleed outside the bubble. User messages stay as plain text.
// ==============================
const MARKDOWN_CLASS = "prose prose-sm max-w-none text-slate-900 prose-p:my-1 prose-p:leading-relaxed prose-headings:font-semibold prose-headings:text-slate-900 prose-headings:mt-3 prose-headings:mb-1 prose-ul:my-1 prose-ul:pl-4 prose-ol:my-1 prose-ol:pl-4 prose-li:my-0.5 prose-strong:font-semibold prose-strong:text-slate-900 prose-em:italic prose-a:text-[#F07E62] prose-a:underline-offset-2 prose-blockquote:border-l-2 prose-blockquote:border-slate-300 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-slate-600 prose-blockquote:my-2 prose-code:bg-slate-200 prose-code:text-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl prose-pre:p-3 prose-pre:text-xs prose-pre:overflow-x-auto prose-pre:my-2 prose-hr:border-slate-200 prose-hr:my-3";

function MarkdownBody({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  return (
    <div className={MARKDOWN_CLASS}>
      <ReactMarkdown>{text}</ReactMarkdown>
      {isStreaming && <Cursor />}
    </div>
  );
}

// ==============================
// MAIN COMPONENT
// ==============================
export default function ChatPanel(props: { role?: ChatRole }) {
  const role = normalizeRole(props.role);

  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: uid(),
      from: "assistant",
      text: welcomeForRole(role),
      groundedInVectorDb: true,
      usedLlmFallback: false,
    },
  ]);

  const [pending, setPending] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const lastAssistantMeta = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.from === "assistant" && !m.streaming) return m;
    }
    return null;
  }, [messages]);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (scrollRef.current)
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending || streamingId) return;
    setError(null);

    const text = (inputRef.current?.value ?? "").trim();
    if (!text) return;

    const userMsg: ChatMsg = { id: uid(), from: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    if (inputRef.current) inputRef.current.value = "";
    scrollToBottom();

    setPending(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ message: text, role }),
      });

      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => null);
        setError(payload?.detail || payload?.error || "AI service error. Try again.");
        setPending(false);
        return;
      }

      const assistantId = uid();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, from: "assistant", text: "", streaming: true },
      ]);
      setPending(false);
      setStreamingId(assistantId);
      scrollToBottom();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const json = trimmed.slice(5).trim();
          if (!json) continue;

          let evt: Record<string, unknown>;
          try { evt = JSON.parse(json); } catch { continue; }

          if (typeof evt.token === "string") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, text: m.text + evt.token } : m
              )
            );
            scrollToBottom();
          }

          if (evt.done === true) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      streaming: false,
                      groundedInVectorDb: Boolean(evt.groundedInVectorDb),
                      usedLlmFallback: Boolean(evt.usedLlmFallback),
                    }
                  : m
              )
            );
            setStreamingId(null);
          }

          if (typeof evt.error === "string") {
            setError(evt.error);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, streaming: false } : m
              )
            );
            setStreamingId(null);
          }
        }
      }
    } catch {
      setError("Network error. Try again.");
      setPending(false);
      setStreamingId(null);
    } finally {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as FormEvent);
    }
  }

  const isBusy = pending || !!streamingId;

  return (
    <section className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">AI Q&amp;A</div>
          <div className="text-[11px] text-slate-500">
            {role === "visitor"
              ? "Visitor scope: general college info only."
              : "Vector DB first → Gemini fallback (for now)."}
          </div>
        </div>
        <span className="text-[11px] font-semibold rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 capitalize">
          {role}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="p-4 space-y-3 max-h-[380px] overflow-auto">
        {messages.map((m) => {
          const isUser = m.from === "user";
          const isStreaming = m.id === streamingId;
          const showDisclaimer =
            !isUser && !m.streaming && (m.usedLlmFallback || m.groundedInVectorDb === false);

          return (
            <div key={m.id} className={isUser ? "flex justify-end" : "flex justify-start"}>
              <div
                className={[
                  "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  isUser
                    ? "bg-neutral-900 text-white"
                    : "bg-slate-50 text-slate-900 border border-slate-100",
                ].join(" ")}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{m.text}</p>
                ) : (
                  <MarkdownBody text={m.text} isStreaming={isStreaming} />
                )}

                {showDisclaimer && (
                  <div className="mt-2 text-[11px] text-slate-500">
                    This answer was generated by a general AI and may contain inaccuracies.
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {pending && <TypingIndicator />}
      </div>

      {/* Input */}
      <div className="px-4 pb-4">
        {error && (
          <div
            className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={2}
            placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
            onKeyDown={onKeyDown}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50"
            disabled={isBusy}
          />
          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.35)] transition hover:brightness-[0.97] active:brightness-[0.95] disabled:opacity-60"
          >
            <SendIcon className="w-4 h-4" />
          </button>
        </form>

        {lastAssistantMeta &&
          (lastAssistantMeta.usedLlmFallback ||
            lastAssistantMeta.groundedInVectorDb === false) && (
            <div className="mt-2 text-[11px] text-slate-500">
              Tip: once RAG is wired, grounded answers won't show this disclaimer.
            </div>
          )}
      </div>
    </section>
  );
}