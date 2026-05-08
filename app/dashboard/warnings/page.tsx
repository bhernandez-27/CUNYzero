"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { StudentWarningsDTO, WarningEntry } from "@/lib/warnings/types";

const SOURCE_LABEL: Record<WarningEntry["source"], string> = {
  review: "Course Review",
  complaint: "Complaint",
  enrollment: "Enrollment",
  graduation: "Graduation Application",
  grade: "Grade",
  system: "System",
  other: "Other",
};

const SOURCE_STYLE: Record<WarningEntry["source"], string> = {
  review: "border-purple-200 bg-purple-50 text-purple-800",
  complaint: "border-orange-200 bg-orange-50 text-orange-800",
  enrollment: "border-blue-200 bg-blue-50 text-blue-800",
  graduation: "border-indigo-200 bg-indigo-50 text-indigo-800",
  grade: "border-red-200 bg-red-50 text-red-800",
  system: "border-slate-200 bg-slate-50 text-slate-700",
  other: "border-slate-200 bg-slate-50 text-slate-700",
};

export default function WarningsPage() {
  const [data, setData] = useState<StudentWarningsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/warnings/student", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load warnings");
        setData((await res.json()) as StudentWarningsDTO);
      } catch {
        setError("Could not load your warnings. Try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F1]">
      <DashboardShell
        main={
          loading ? (
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-sm text-slate-500">
              Loading warnings…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
              {error}
            </div>
          ) : data ? (
            <WarningsView data={data} />
          ) : null
        }
      />
    </div>
  );
}

function WarningsView({ data }: { data: StudentWarningsDTO }) {
  const remaining = data.suspension_threshold - data.warning_count;
  const urgent = data.warning_count >= data.suspension_threshold - 1;

  return (
    <>
      <div className="text-lg font-semibold text-slate-900">Warnings</div>
      <div className="mt-1 text-sm text-slate-500">
        Academic conduct record for your account.
      </div>

      {/* Suspension / suspended banner */}
      {data.suspended ? (
        <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-900">
          <span className="font-semibold">Account suspended.</span> Your account has been suspended
          for one semester. Contact the Registrar to resolve your status.
        </div>
      ) : urgent && data.warning_count > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <span className="font-semibold">Warning:</span> You have {data.warning_count} warning
          {data.warning_count !== 1 ? "s" : ""}. One more warning will result in a one-semester
          suspension and a fine payable to the Registrar.
        </div>
      ) : null}

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard
          label="Active Warnings"
          value={String(data.warning_count)}
          sub={`of ${data.suspension_threshold} before suspension`}
          accent={
            data.warning_count >= data.suspension_threshold
              ? "text-red-600"
              : data.warning_count === data.suspension_threshold - 1
              ? "text-amber-600"
              : undefined
          }
        />
        <StatCard
          label="Warnings Until Suspension"
          value={data.suspended ? "Suspended" : String(Math.max(0, remaining))}
          sub="3 warnings = 1-semester suspension"
          accent={data.suspended ? "text-red-600" : remaining <= 1 ? "text-amber-600" : undefined}
        />
        <StatCard
          label="Status"
          value={data.suspended ? "Suspended" : data.warning_count === 0 ? "Clear" : "Active"}
          sub={data.suspended ? "Contact Registrar" : data.warning_count === 0 ? "No issues on record" : "Warnings on record"}
          accent={data.suspended ? "text-red-600" : data.warning_count === 0 ? "text-emerald-600" : "text-amber-600"}
        />
      </div>

      {/* Honor roll note */}
      {data.warning_count > 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <span className="font-semibold">Honor Roll benefit:</span> One Honor Roll designation may
          be used to remove one active warning from your record. Contact the Registrar if you
          believe you are eligible.
        </div>
      ) : null}

      {/* Warning history */}
      <div className="mt-6">
        <div className="text-sm font-semibold text-slate-900 mb-3">Warning history</div>
        {data.warnings.length === 0 ? (
          <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-6 py-10 text-center text-sm text-slate-500">
            No warnings on record. Keep up the good work.
          </div>
        ) : (
          <div className="space-y-3">
            {data.warnings.map((w) => (
              <WarningRow key={w.warning_id} warning={w} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function WarningRow({ warning }: { warning: WarningEntry }) {
  const date = new Date(warning.issued_at);
  const formatted = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={[
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                SOURCE_STYLE[warning.source],
              ].join(" ")}
            >
              {SOURCE_LABEL[warning.source]}
            </span>
            <span className="font-mono text-xs text-slate-400">{warning.warning_id}</span>
          </div>
          <div className="mt-2 text-sm text-slate-800">{warning.reason}</div>
          <div className="mt-1.5 text-xs text-slate-500">Issued by {warning.issued_by}</div>
        </div>
        <div className="shrink-0 text-xs text-slate-400 text-right whitespace-nowrap">{formatted}</div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={["mt-1 text-2xl font-bold", accent ?? "text-slate-900"].join(" ")}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-slate-400">{sub}</div>
    </div>
  );
}
