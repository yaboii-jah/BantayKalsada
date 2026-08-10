"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function ReportDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 inline-flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Unable to load report
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Something went wrong while loading this report. Please try again.
        </p>
        <Button onClick={reset} variant="outline" className="mt-6">
          Try again
        </Button>
      </div>
    </div>
  );
}
