"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function FeedbackError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <AlertCircle className="mx-auto size-12 text-destructive" />
      <h2 className="mt-4 text-lg font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || "Failed to load the feedback form."}
      </p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
