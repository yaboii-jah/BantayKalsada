"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Map, Menu, LogOut, FileText, MessageSquare } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import type { User } from "@supabase/supabase-js";

export function PublicNav() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
    router.refresh();
  };

  const initials = user?.email?.charAt(0).toUpperCase() ?? "?";

  const navLinks = (
    <>
      <Link
        href="/browse"
        className="text-sm font-medium text-foreground transition-colors hover:text-primary"
        onClick={() => setSheetOpen(false)}
      >
        Browse reports
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-[1100] w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-foreground transition-colors hover:text-primary"
        >
          <Map className="size-5 text-primary" />
          Bantay Kalsada
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {navLinks}
          <ThemeToggle />
          {!loading && (
            <>
              {user ? (
                <>
                  <Link
                    href="/feedback"
                    className="text-sm font-medium text-foreground transition-colors hover:text-primary"
                  >
                    Feedback
                  </Link>
                  <NotificationBell userId={user.id} />
                  <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((p) => !p)}
                    className="focus:outline-none"
                    aria-label="User menu"
                  >
                    <Avatar className="size-8 cursor-pointer">
                      <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
                      <Link
                        href="/my-feedback"
                        className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
                        onClick={() => setMenuOpen(false)}
                      >
                        <MessageSquare className="size-4" />
                        My Feedback
                      </Link>
                      <Link
                        href="/my-reports"
                        className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
                        onClick={() => setMenuOpen(false)}
                      >
                        <FileText className="size-4" />
                        My Reports
                      </Link>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-sm text-destructive outline-hidden select-none hover:bg-destructive/10"
                      >
                        <LogOut className="size-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Sign in
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Get started</Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 px-4 pb-6">
            <nav className="mt-8 flex flex-1 flex-col items-center gap-4">
              {navLinks}
              {!loading && !user && (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-foreground hover:text-primary"
                    onClick={() => setSheetOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setSheetOpen(false)}
                  >
                    <Button className="w-full">Get started</Button>
                  </Link>
                </>
              )}
                  {!loading && user && (
                    <>
                      <Link
                        href="/feedback"
                        className="text-sm font-medium text-foreground hover:text-primary"
                        onClick={() => setSheetOpen(false)}
                      >
                        Feedback
                      </Link>
                      <Link
                        href="/my-feedback"
                        className="text-sm font-medium text-foreground hover:text-primary"
                        onClick={() => setSheetOpen(false)}
                      >
                        My Feedback
                      </Link>
                      <Link
                        href="/my-reports"
                        className="text-sm font-medium text-foreground hover:text-primary"
                        onClick={() => setSheetOpen(false)}
                      >
                        My Reports
                      </Link>
                      <div className="flex-1" />
                      <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      handleSignOut();
                      setSheetOpen(false);
                    }}
                  >
                    <LogOut className="mr-2 size-4" />
                    Sign out
                  </Button>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
        </div>
      </div>
    </header>
  );
}
