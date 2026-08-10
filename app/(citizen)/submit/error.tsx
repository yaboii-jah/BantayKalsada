"use client";

import { Button } from "@/components/ui/button";

export default function SubmitError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="mb-2 text-xl font-semibold text-foreground">
        Something went wrong
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred while loading the form."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
