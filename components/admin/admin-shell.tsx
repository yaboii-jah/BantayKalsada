"use client";

import { useSyncExternalStore } from "react";
import { PanelLeftOpen } from "lucide-react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTheme } from "@/components/admin/admin-theme";

const SIDEBAR_KEY = "bk-admin-sidebar-hidden";
const SIDEBAR_EVENT = "bk-admin-sidebar-toggle";

function subscribeToSidebar(callback: () => void) {
  window.addEventListener(SIDEBAR_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SIDEBAR_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSidebarSnapshot() {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

function getSidebarServerSnapshot() {
  return false;
}

function setSidebarHidden(hidden: boolean) {
  try {
    if (hidden) {
      window.localStorage.setItem(SIDEBAR_KEY, "1");
    } else {
      window.localStorage.removeItem(SIDEBAR_KEY);
    }
  } catch {
    // localStorage unavailable; state is session-only
  }
  window.dispatchEvent(new Event(SIDEBAR_EVENT));
}

export function AdminShell({
  pendingCount,
  flagsCount,
  adminName,
  children,
}: {
  pendingCount: number;
  flagsCount: number;
  adminName: string;
  children: React.ReactNode;
}) {
  const hidden = useSyncExternalStore(
    subscribeToSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot,
  );

  return (
    <div className="flex min-h-screen">
      <AdminTheme />
      {!hidden && (
        <AdminSidebar
          pendingCount={pendingCount}
          flagsCount={flagsCount}
          adminName={adminName}
          onCollapse={() => setSidebarHidden(true)}
        />
      )}
      <div className="flex min-h-screen flex-1 flex-col">
        {hidden && (
          <header className="flex items-center gap-3 border-b border-border bg-muted px-4 py-3">
            <button
              type="button"
              onClick={() => setSidebarHidden(false)}
              aria-label="Show sidebar"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <PanelLeftOpen className="size-5" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              Bantay Kalsada
            </span>
          </header>
        )}
        <main className="flex-1 overflow-y-auto bg-background bg-radial-glow p-6">
          {children}
        </main>
      </div>
    </div>
  );
}