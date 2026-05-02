"use client";

import type { Toast } from "./types";

export default function ToastStack(props: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed z-60 right-5 top-5 w-[340px] max-w-[calc(100vw-2.5rem)] space-y-2">
      {props.toasts.map((t) => {
        const tone =
          t.kind === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
            : t.kind === "error"
              ? "border-red-200 bg-red-50 text-red-950"
              : "border-slate-200 bg-white text-slate-950";
        const pill =
          t.kind === "success"
            ? "bg-emerald-600"
            : t.kind === "error"
              ? "bg-red-600"
              : "bg-slate-600";

        return (
          <div key={t.id} className={`rounded-2xl border shadow-sm px-4 py-3 ${tone}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-1 h-2.5 w-2.5 rounded-full ${pill}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{t.title}</div>
                {t.message ? <div className="mt-0.5 text-xs opacity-80">{t.message}</div> : null}
              </div>
              <button
                type="button"
                onClick={() => props.onDismiss(t.id)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-black/5"
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

