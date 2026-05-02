"use client";

import { useEffect, useState, type ReactNode } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

export default function DashboardShell(props: { main: ReactNode; right?: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const hasRight = Boolean(props.right);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("college0.sidebarCollapsed");
      if (raw === "1") setSidebarCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem("college0.sidebarCollapsed", next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div className="w-full">
      <div
        className={[
          "grid min-h-[calc(100vh-4rem)]",
          sidebarCollapsed ? "lg:grid-cols-[88px_1fr]" : "lg:grid-cols-[280px_1fr]",
        ].join(" ")}
      >
        <aside className="hidden lg:block sticky top-0 h-[calc(100vh-4rem)]">
          <DashboardSidebar collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebar} />
        </aside>

        <div className="min-w-0 px-6 py-6">
          <div
            className={[
              "grid grid-cols-1 gap-6 items-start",
              hasRight ? "xl:grid-cols-[1fr_360px]" : "xl:grid-cols-1",
            ].join(" ")}
          >
            <div className="min-w-0">{props.main}</div>
            {props.right ? <div className="min-w-0 xl:sticky xl:top-6 space-y-6">{props.right}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
