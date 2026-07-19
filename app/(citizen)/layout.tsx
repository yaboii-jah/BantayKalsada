import type { ReactNode } from "react";
import { PublicNav } from "@/components/public-nav";
import Link from "next/link";
import { Map } from "lucide-react";

export default function CitizenLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNav />
      <main className="flex-1 bg-dot-grid">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Map className="size-3.5" />
            <span>Bantay Kalsada</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/browse" className="hover:text-foreground transition-colors">
              Browse
            </Link>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
