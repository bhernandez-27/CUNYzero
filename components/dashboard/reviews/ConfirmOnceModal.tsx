"use client";

export default function ConfirmOnceModal(props: {
  open: boolean;
  title: string;
  body: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
}) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-70">
      <div className="absolute inset-0 bg-black/40" onClick={props.onCancel} aria-hidden="true" />
      <div className="absolute inset-0 grid place-items-center p-5">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={props.title}
          className="w-full max-w-md rounded-2xl bg-white border border-black/10 shadow-xl"
        >
          <div className="px-5 py-4 border-b border-black/5">
            <div className="text-sm font-semibold text-slate-900">{props.title}</div>
          </div>
          <div className="px-5 py-4 text-sm text-slate-700 leading-relaxed">{props.body}</div>
          <div className="px-5 py-4 border-t border-black/5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={props.onCancel}
              className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
              disabled={props.pending}
            >
              {props.cancelText ?? "Cancel"}
            </button>
            <button
              type="button"
              onClick={props.onConfirm}
              className="inline-flex items-center justify-center rounded-xl bg-[#F07E62] px-3 py-2 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(240,126,98,0.25)] hover:brightness-[0.97] active:brightness-[0.95] transition disabled:opacity-60"
              disabled={props.pending}
            >
              {props.pending ? "Submitting…" : props.confirmText ?? "Submit review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

