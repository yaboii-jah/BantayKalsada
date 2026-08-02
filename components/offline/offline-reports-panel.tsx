"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CloudOff, RefreshCw, Trash2, AlertTriangle, Loader2, Pencil } from "lucide-react";
import {
  getQueuedReportsForUser,
  removeQueuedReport,
  updateQueuedReport,
  type QueuedReport,
} from "@/lib/offline-queue";
import { submitQueuedReport } from "@/lib/offline-submit";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { formatReportDate } from "@/lib/date-utils";

export function OfflineReportsPanel() {
  const router = useRouter();
  const [reports, setReports] = useState<QueuedReport[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setReports([]);
      return;
    }
    setReports(await getQueuedReportsForUser(user.id));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      const user = data.user;
      if (!user) {
        setReports([]);
        return;
      }
      setReports(await getQueuedReportsForUser(user.id));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRetry = useCallback(
    async (report: QueuedReport) => {
      setRetryingId(report.id);
      const result = await submitQueuedReport(report);
      if (result.ok) {
        await removeQueuedReport(report.id);
        toast.success(
          `Offline report "${report.title}" was submitted successfully!`,
        );
        router.refresh();
      } else {
        await updateQueuedReport(report.id, { lastError: result.error });
        toast.error(
          `Couldn't submit "${report.title}": ${result.error}`,
          { duration: 6000 },
        );
      }
      setRetryingId(null);
      await refresh();
    },
    [router, refresh],
  );

  const handleDiscard = useCallback(
    async (id: string) => {
      await removeQueuedReport(id);
      toast("Offline report removed.");
      await refresh();
    },
    [refresh],
  );

  if (reports.length === 0) return null;

  return (
    <div className="mb-8 rounded-lg border border-primary/20 bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <CloudOff className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Saved offline reports
        </h2>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {reports.length} waiting
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        These reports were saved on this device while you were offline. They
        are submitted automatically when you&apos;re back online — you can also
        retry or discard them here.
      </p>

      <ul className="space-y-3">
        {reports.map((report) => (
          <li
            key={report.id}
            className="rounded-md border border-border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {report.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  Queued {formatReportDate(report.queuedAt)} &middot;{" "}
                  {report.photoUrls.length + report.photoFiles.length} photo
                  {report.photoUrls.length + report.photoFiles.length !== 1
                    ? "s"
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <Link href={`/offline-edit/${report.id}`}>
                    <Pencil className="mr-1.5 size-3.5" />
                    Edit
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={retryingId === report.id}
                  onClick={() => handleRetry(report)}
                >
                  {retryingId === report.id ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 size-3.5" />
                  )}
                  Retry
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDiscard(report.id)}
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  Discard
                </Button>
              </div>
            </div>
            {report.lastError && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {report.lastError}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
