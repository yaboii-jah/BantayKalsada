import type { ReactNode } from "react";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { InstallPrompt } from "@/components/install-prompt";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNav />
      <main id="main-content" tabIndex={-1} className="flex-1 bg-radial-glow">{children}</main>
      <InstallPrompt />
      <PublicFooter />
    </div>
  );
}
