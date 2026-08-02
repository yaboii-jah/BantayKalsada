"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  getQueuedReports,
  removeQueuedReport,
  updateQueuedReport,
} from "@/lib/offline-queue";
import { submitQueuedReport } from "@/lib/offline-submit";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function OfflineQueueProcessor() {
  const processingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    const run = async () => {
      const reports = await getQueuedReports();
      if (reports.length === 0) return;

      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const report of reports) {
        if (report.userId !== user.id) continue;

        const result = await submitQueuedReport(report);
        if (result.ok) {
          await removeQueuedReport(report.id);
          toast.success(
            `Offline report "${report.title}" was submitted successfully!`,
          );
        } else {
          await updateQueuedReport(report.id, { lastError: result.error });
          toast.error(
            `Couldn't submit "${report.title}": ${result.error}`,
            { duration: 6000 },
          );
        }
      }
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
      processingRef.current = false;
    }
  }, []);

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
    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [processQueue]);

  return null;
}
