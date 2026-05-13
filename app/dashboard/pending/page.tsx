import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function PendingApplicationPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth");
  }
  if (session.role !== "applicant") {
    // Already-approved users shouldn't see this page; bounce them to their portal.
    if (session.role === "registrar") redirect("/dashboard/registrar/applications");
    if (session.role === "instructor") redirect("/dashboard/instructor");
    redirect("/dashboard");
  }

  const applicant = session.applicant;
  const isRejected = applicant?.status === "REJECTED";
  const kindLabel = applicant?.kind === "instructor" ? "Instructor" : "Student";

  return (
    <div className="min-h-screen bg-[#F7F5F1]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-sm font-medium text-[#F07E62]">College0 · Application status</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
          Hi {session.name}, your account is locked
        </h1>
        <p className="mt-3 text-sm text-neutral-600 leading-relaxed">
          You have signed in successfully, but the rest of College0 unlocks only after the Registrar reviews your
          application. Until then, this is the only page you can access.
        </p>

        <div
          className={[
            "mt-8 rounded-[24px] border p-6 shadow-sm",
            isRejected
              ? "border-red-200 bg-red-50/80"
              : "border-amber-200 bg-amber-50/80",
          ].join(" ")}
        >
          <div className="flex items-center gap-2">
            <span
              className={[
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                isRejected
                  ? "bg-red-200/80 text-red-900"
                  : "bg-amber-200/80 text-amber-900",
              ].join(" ")}
            >
              {isRejected ? "Rejected" : "Pending review"}
            </span>
            <span className="text-xs text-neutral-700">{kindLabel} application</span>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Application ID</dt>
              <dd className="mt-0.5 font-mono text-neutral-900">{applicant?.application_id ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Email on file</dt>
              <dd className="mt-0.5 text-neutral-900">{applicant?.applied_email ?? "—"}</dd>
            </div>
            {applicant?.kind === "student" && applicant.prior_gpa !== null && applicant.prior_gpa !== undefined ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Prior GPA</dt>
                <dd className="mt-0.5 text-neutral-900">{Number(applicant.prior_gpa).toFixed(2)}</dd>
              </div>
            ) : null}
          </dl>

          <p className={["mt-5 text-sm leading-relaxed", isRejected ? "text-red-900" : "text-amber-900"].join(" ")}>
            {isRejected
              ? "The Registrar has rejected this application. You may submit a fresh application from the public site if your circumstances change."
              : "Please check back later. This page will keep showing your status until a decision is made — once approved, signing in again will unlock the full dashboard automatically."}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/public"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-50 transition"
          >
            View public dashboard
          </Link>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
