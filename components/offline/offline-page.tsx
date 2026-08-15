"use client";

import { Wifi, WifiOff } from "lucide-react";

import { useOnline } from "@/lib/use-online";
import { ReportForm } from "@/components/reports/report-form";

export function OfflinePage() {
  const { isOnline } = useOnline();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col items-center gap-3 rounded-xl border bg-background/80 p-6 text-center shadow-sm">
        <div className="inline-flex size-12 items-center justify-center rounded-full bg-muted">
          {isOnline ? (
            <Wifi className="size-6 text-primary" />
          ) : (
            <WifiOff className="size-6 text-muted-foreground" />
          )}
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          {isOnline ? "You're back online" : "You're offline"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isOnline
            ? "Your connection is back. Submit your report now and it will be sent right away."
            : "Your connection dropped, but you can still submit a report. It will be saved on this device and sent automatically once you're back online."}
        </p>
      </div>

      <ReportForm />
    </div>
  );
}
