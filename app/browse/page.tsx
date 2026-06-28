import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Map } from "lucide-react";

export default function BrowsePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Map className="size-5 text-primary" />
          Bantay Kalsada
        </div>
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
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-6 inline-flex size-16 items-center justify-center rounded-2xl bg-muted">
            <Map className="size-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            No reports yet
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            There are no road hazard reports to show right now. Be the first to
            report an issue in your community.
          </p>
          <Link href="/submit" className="mt-6 inline-block">
            <Button>Submit a report</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
