"use client";

export default function StarRating(props: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const value = clamp(props.value, 0, 5);
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= value;
          return (
            <button
              key={n}
              type="button"
              disabled={props.disabled}
              onClick={() => props.onChange(n)}
              className={[
                "h-9 w-9 grid place-items-center rounded-xl transition",
                props.disabled ? "opacity-60" : "hover:bg-slate-100",
              ].join(" ")}
              aria-label={`Set rating to ${n} star${n === 1 ? "" : "s"}`}
              title={`${n} star${n === 1 ? "" : "s"}`}
            >
              <span className={active ? "text-amber-500" : "text-slate-300"} aria-hidden="true">
                ★
              </span>
            </button>
          );
        })}
      </div>
      <div className="text-sm font-semibold text-slate-800">{value ? `${value}/5` : "Select a rating"}</div>
    </div>
  );
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

