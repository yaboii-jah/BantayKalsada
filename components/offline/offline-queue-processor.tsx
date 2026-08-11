"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getQueuedReports,
  removeQueuedReport,
  updateQueuedReport,
  MAX_AUTORETRY_ATTEMPTS,
  getNextRetryTime,
} from "@/lib/offline-queue";
import { submitQueuedReport } from "@/lib/offline-submit";
import {
  createOfflineSubmitFailedNotification,
  deleteOfflineSubmitNotification,
} from "@/app/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { setProcessingIds } from "@/lib/offline-processing";
import { emitQueueChanged } from "@/lib/offline-queue-events";
import { useAnalytics } from "@/lib/analytics";

export function OfflineQueueProcessor() {
  const router = useRouter();
  const track = useAnalytics();
  const processingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    processingRef.current = true;

    const run = async () => {
      const reports = await getQueuedReports();
      if (reports.length === 0) {
        setProcessingIds(new Set());
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProcessingIds(new Set());
        return;
      }

      const active = new Set<string>();
      for (const report of reports) {
        if (report.userId !== user.id) continue;
        active.add(report.id);
      }
      setProcessingIds(active);

      let submittedAny = false;
      for (const report of reports) {
        if (report.userId !== user.id) continue;

        if (
          report.rateLimitedUntil &&
          Date.now() < new Date(report.rateLimitedUntil).getTime()
        ) {
          continue;
        }

        const attemptCount = report.attemptCount ?? 0;
        if (attemptCount >= MAX_AUTORETRY_ATTEMPTS) continue;

        if (Date.now() < getNextRetryTime(attemptCount, report.lastAttemptAt)) {
          continue;
        }

        const result = await submitQueuedReport(report);
        if (result.ok) {
          await removeQueuedReport(report.id);
          void deleteOfflineSubmitNotification(report.id);
          emitQueueChanged();
          submittedAny = true;
          track("Offline Report Submitted");
          toast.success(
            `Offline report "${report.title}" was submitted successfully!`,
          );
          continue;
        }

        if (result.rateLimited && result.retryAfter) {
          await updateQueuedReport(report.id, {
            lastError: result.error,
            rateLimitedUntil: result.retryAfter,
          });
          emitQueueChanged();
          continue;
        }

        const nextAttemptCount = attemptCount + 1;
        await updateQueuedReport(report.id, {
          lastError: result.error,
          attemptCount: nextAttemptCount,
          lastAttemptAt: new Date().toISOString(),
        });

        if (nextAttemptCount >= MAX_AUTORETRY_ATTEMPTS) {
          void createOfflineSubmitFailedNotification(report.id, report.title);
        }
      }
      if (submittedAny) {
        router.refresh();
      }
      setProcessingIds(new Set());
    };

    try {
      if ("locks" in navigator) {
        await navigator.locks.request("bantay-kalsada-offline-queue", run);
      } else {
        await run();
      }
    } catch (err) {
      console.error("Offline queue processing error:", err);
    } finally {
      setProcessingIds(new Set());
      processingRef.current = false;
    }
  }, [router, track]);

  useEffect(() => {
    void processQueue();

    const handleOnline = () => void processQueue();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void processQueue();
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    const timer = setInterval(() => void processQueue(), 60_000);

    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(timer);
    };
  }, [processQueue]);

  return null;
}
