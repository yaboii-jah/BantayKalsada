"use client";

import { useState, useSyncExternalStore } from "react";
import { PanelLeftOpen } from "lucide-react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTheme } from "@/components/admin/admin-theme";
import { cn } from "@/lib/utils";

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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <AdminTheme />

      {/* Desktop rail — in-flow, only when not collapsed */}
      {!hidden && (
        <div className="hidden lg:flex">
          <AdminSidebar
            pendingCount={pendingCount}
            flagsCount={flagsCount}
            adminName={adminName}
            onCollapse={() => setSidebarHidden(true)}
          />
        </div>
      )}

      {/* Mobile drawer overlay — never pushes content */}
      <div className="lg:hidden">
        <div
          className={cn(
            "fixed inset-0 z-[1200] bg-black/60 transition-opacity",
            mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-[1250] w-64 transition-transform duration-200 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
          inert={!mobileOpen}
          aria-hidden={!mobileOpen}
        >
          <AdminSidebar
            pendingCount={pendingCount}
            flagsCount={flagsCount}
            adminName={adminName}
            onCollapse={() => setMobileOpen(false)}
            onNavigate={() => setMobileOpen(false)}
          />
        </aside>
      </div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-[1100] flex items-center gap-3 border-b border-border bg-muted px-4 py-3",
            hidden ? "" : "lg:hidden",
          )}
        >
          {/* Mobile hamburger — opens the drawer */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground lg:hidden"
          >
            <PanelLeftOpen className="size-5" />
          </button>
          {/* Desktop reopen — restores the rail */}
          <button
            type="button"
            onClick={() => setSidebarHidden(false)}
            aria-label="Show sidebar"
            className="hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground lg:inline-flex"
          >
            <PanelLeftOpen className="size-5" />
          </button>
          <span className="text-sm font-semibold text-foreground">
            Bantay Kalsada
          </span>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto bg-background bg-radial-glow p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}