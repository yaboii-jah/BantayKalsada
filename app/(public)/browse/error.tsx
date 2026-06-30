"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function BrowseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 inline-flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Unable to load reports
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          We&apos;re having trouble connecting to the server. Please try again.
          If the problem persists, we&apos;re working to fix it.
        </p>
        <Button onClick={reset} variant="outline" className="mt-6">
          Try again
        </Button>
      </div>
    </div>
  );
}
