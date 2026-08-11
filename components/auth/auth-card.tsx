import type { ReactNode } from "react";

interface AuthCardProps {
  children: ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-card p-6 shadow-lg ring-1 ring-foreground/10 sm:p-8">
      {children}
    </div>
  );
}
