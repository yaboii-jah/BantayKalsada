"use client";

import { useEffect, useState } from "react";
import { Loader2, CloudUpload } from "lucide-react";
import { subscribeProcessing } from "@/lib/offline-processing";

export function OfflineUploadBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    return subscribeProcessing((ids) => setCount(ids.size));
  }, []);

  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur sm:px-6">
      <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
      <div className="h-2.5 w-16 shrink-0 animate-pulse rounded-full bg-muted-foreground/30" />
      <p className="text-xs font-medium text-foreground">
        Uploading {count} offline {count === 1 ? "report" : "reports"}
        </p>
      <CloudUpload className="ml-auto size-4 shrink-0 text-muted-foreground" />
    </div>
  );
}