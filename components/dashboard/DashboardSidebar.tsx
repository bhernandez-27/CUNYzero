"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  disabled?: boolean;
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Registration", href: "/dashboard/registration" },
  { label: "Classroom", href: "#", disabled: true },
  { label: "Live Lessons", href: "#", disabled: true },
  { label: "Recorded Lessons", href: "#", disabled: true },
  { label: "Video Library", href: "#", disabled: true },
];

function SidebarToggleIcon(props: { collapsed: boolean }) {
  return props.collapsed ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 6H4m6 6H4m6 6H4M14 6h6m-6 6h6m-6 6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function DashboardSidebar(props: { collapsed?: boolean; onToggleCollapsed?: () => void }) {
  const pathname = usePathname();
  const collapsed = Boolean(props.collapsed);

  return (
    <div
      className={[
        "h-full bg-white border-r border-black/5",
        "flex flex-col",
        collapsed ? "w-[88px]" : "w-[280px]",
      ].join(" ")}
    >
      <div className={["flex items-center", collapsed ? "justify-center px-3 py-4" : "justify-between px-5 py-4"].join(" ")}>
        {collapsed ? null : (
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white grid place-items-center font-semibold shrink-0">
              L
            </div>
            <div className="block min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">Learnthru</div>
              <div className="text-xs text-slate-500 truncate">Student portal</div>
            </div>
          </div>
        )}

        {props.onToggleCollapsed ? (
          <button
            type="button"
            onClick={props.onToggleCollapsed}
            className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-black/10 bg-white text-slate-700 hover:bg-slate-50 transition"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <SidebarToggleIcon collapsed={collapsed} />
          </button>
        ) : null}
      </div>

      {collapsed ? null : (
        <nav className="space-y-1 text-sm px-4" aria-label="Student portal navigation">
          {NAV.map((item) => {
            const active =
              item.href !== "#" &&
              (pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href)));
            const className = [
              "flex items-center gap-3 rounded-xl px-3 py-2 transition",
              active ? "bg-neutral-900 text-white" : "text-slate-700 hover:bg-slate-100",
              item.disabled ? "opacity-60 pointer-events-none" : "",
            ]
              .filter(Boolean)
              .join(" ");

            const dotClassName = [
              "h-2.5 w-2.5 rounded-full",
              active ? "bg-white/90" : "bg-slate-300",
            ].join(" ");

            return item.disabled ? (
              <span key={item.label} className={className} aria-disabled="true">
                <span className={dotClassName} aria-hidden="true" />
                {item.label}
              </span>
            ) : (
              <Link key={item.label} href={item.href} className={className} aria-current={active ? "page" : undefined}>
                <span className={dotClassName} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="mt-auto" />

      {collapsed ? null : (
        <div className="p-4">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <div className="text-sm font-semibold text-slate-900">Need help?</div>
            <div className="mt-1 text-xs text-slate-600">Do you have any problem while using the system?</div>
            <a
              href="#"
              className="mt-3 inline-flex items-center justify-center rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
            >
              Contact support
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

