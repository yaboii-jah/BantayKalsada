import Link from "next/link";
import { Map } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Map className="size-3.5" />
            <span>Bantay Kalsada</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/browse" className="transition-colors hover:text-foreground">
              Browse
            </Link>
            <Link href="/about" className="transition-colors hover:text-foreground">
              About
            </Link>
            <Link href="/guidelines" className="transition-colors hover:text-foreground">
              Guidelines
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/disclaimer" className="transition-colors hover:text-foreground">
              Disclaimer
            </Link>
          </div>
        </div>
        <div className="text-xs">
          &copy; {new Date().getFullYear()} Bantay Kalsada. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
