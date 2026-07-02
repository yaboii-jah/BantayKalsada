"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function AdminReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div>
        <p className="text-lg font-medium text-foreground">
          Something went wrong
        </p>
        <p className="text-sm text-muted-foreground">
          Failed to load the report details.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
