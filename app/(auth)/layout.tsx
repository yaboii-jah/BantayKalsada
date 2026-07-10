import type { ReactNode } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-auth-gradient px-4 py-12">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      <AuthCard>{children}</AuthCard>
    </div>
  );
}
