"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { TabooWordsDTO } from "@/app/api/registrar/taboo/route";

export default function TabooPage() {
  const [words, setWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [removing, setRemoving] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/registrar/taboo", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as TabooWordsDTO;
        setWords(data.words);
      } catch {
        setLoadError("Could not load taboo word list. Try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const word = input.trim().toLowerCase();
    if (!word) return;
    if (words.includes(word)) {
      setAddError(`"${word}" is already on the list.`);
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/registrar/taboo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ word }),
      });
      const payload = (await res.json()) as TabooWordsDTO & { message?: string };
      if (!res.ok) {
        setAddError((payload as unknown as { message?: string }).message ?? "Could not add word.");
        return;
      }
      setWords(payload.words);
      setInput("");
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch {
      setAddError("Network error. Try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(word: string) {
    setRemoving(word);
    setRemoveError(null);
    try {
      const res = await fetch("/api/registrar/taboo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ word }),
      });
      const payload = (await res.json()) as TabooWordsDTO & { message?: string };
      if (!res.ok) {
        setRemoveError((payload as unknown as { message?: string }).message ?? "Could not remove word.");
        return;
      }
      setWords(payload.words);
    } catch {
      setRemoveError("Network error. Try again.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          <div className="max-w-2xl">
            <div className="text-lg font-semibold text-slate-900">Taboo Words</div>
            <div className="mt-1 text-sm text-slate-500">
              Words on this list are automatically filtered from student course reviews. 1–2
              matches replaces words with <code className="text-xs bg-slate-100 px-1 rounded">*</code> and issues 1 warning.
              3+ matches blocks the review entirely and issues 2 warnings.
            </div>

            {/* Add form */}
            <form onSubmit={(e) => void handleAdd(e)} className="mt-5 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); setAddError(null); }}
                placeholder="Add a word…"
                disabled={adding || loading}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F07E62]/25 focus:border-[#F07E62]/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={adding || !input.trim() || loading}
                className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97] transition disabled:opacity-60"
              >
                {adding ? "Adding…" : "Add"}
              </button>
            </form>

            {addError && (
              <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {addError}
              </div>
            )}

            {removeError && (
              <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {removeError}
              </div>
            )}

            {/* Word list */}
            <div className="mt-5 rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4">
              {loading ? (
                <div className="py-6 text-sm text-slate-400 text-center">Loading word list…</div>
              ) : loadError ? (
                <div className="py-4 text-sm text-red-800">{loadError}</div>
              ) : words.length === 0 ? (
                <div className="py-6 text-sm text-slate-400 text-center">
                  No taboo words defined. Add words above to activate filtering.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {[...words].sort().map((word) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700"
                    >
                      {word}
                      <button
                        type="button"
                        onClick={() => void handleRemove(word)}
                        disabled={removing === word}
                        aria-label={`Remove "${word}"`}
                        className="text-slate-400 hover:text-red-500 transition disabled:opacity-40 leading-none"
                      >
                        {removing === word ? "…" : "×"}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 text-xs text-slate-400">
              {!loading && !loadError && `${words.length} word${words.length !== 1 ? "s" : ""} on the filter list.`}
            </div>
          </div>
        }
      />
    </div>
  );
}
