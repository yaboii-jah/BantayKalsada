"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Clock,
  CheckCircle,
  XCircle,
  CheckCheck,
  MessageSquare,
  LogOut,
  ShieldCheck,
  Flag,
  PanelLeftClose,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/pending", label: "Pending", icon: Clock },
  { href: "/admin/approved", label: "Approved", icon: CheckCircle },
  { href: "/admin/rejected", label: "Rejected", icon: XCircle },
  { href: "/admin/resolved", label: "Resolved", icon: CheckCheck },
  { href: "/admin/flags", label: "Flags", icon: Flag },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
] as const;

export function AdminSidebar({
  pendingCount,
  flagsCount,
  adminName,
  onCollapse,
}: {
  pendingCount: number;
  flagsCount: number;
  adminName: string;
  onCollapse?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-border bg-muted">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Bantay Kalsada
          </span>
        </div>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Hide sidebar"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <PanelLeftClose className="size-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-muted-foreground/10",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
              {item.label === "Pending" && pendingCount > 0 && (
                <span className="ml-auto inline-flex items-center rounded-full bg-status-pending/10 px-2 py-0.5 text-xs font-medium text-status-pending">
                  {pendingCount}
                </span>
              )}
              {item.label === "Flags" && flagsCount > 0 && (
                <span className="ml-auto inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600">
                  {flagsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
            {adminName.charAt(0).toUpperCase()}
          </div>
          <span className="truncate text-sm font-medium text-sidebar-foreground">
            {adminName}
          </span>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-2 flex w-full items-center gap-3 rounded-md px-1 py-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
