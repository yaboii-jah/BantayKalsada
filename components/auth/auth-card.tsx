import type { ReactNode } from "react";
import { BrandingPanel } from "@/components/auth/branding-panel";

interface AuthCardProps {
  children: ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col overflow-hidden rounded-xl bg-card shadow-lg ring-1 ring-foreground/10 sm:flex-row sm:[&>*:first-child]:w-[45%] sm:[&>*:last-child]:w-[55%]">
      <div className="hidden sm:block">
        <BrandingPanel />
      </div>
      <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10">
        {children}
      </div>
    </div>
  );
}
