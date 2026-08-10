import type { ReactNode } from "react";
import { AuthCard } from "@/components/auth/auth-card";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-auth-gradient px-4 py-12">
      <main id="main-content" tabIndex={-1} className="flex w-full justify-center">
        <AuthCard>{children}</AuthCard>
      </main>
    </div>
  );
}
