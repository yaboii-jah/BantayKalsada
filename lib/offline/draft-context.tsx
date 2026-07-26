"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getDraftCount, getQueuedCount } from "./db";
import { processQueue, type QueueResult } from "./queue";

interface DraftContextValue {
  draftCount: number;
  queuedCount: number;
  processing: boolean;
  lastResult: QueueResult | null;
  refreshDrafts: () => Promise<void>;
  submitQueue: () => Promise<QueueResult | null>;
}

const DraftContext = createContext<DraftContextValue>({
  draftCount: 0,
  queuedCount: 0,
  processing: false,
  lastResult: null,
  refreshDrafts: async () => {},
  submitQueue: async () => null,
});

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draftCount, setDraftCount] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<QueueResult | null>(null);

  const refreshDrafts = useCallback(async () => {
    try {
      const [count, queued] = await Promise.all([
        getDraftCount(),
        getQueuedCount(),
      ]);
      setDraftCount(count);
      setQueuedCount(queued);
    } catch {
      // IndexedDB not available
    }
  }, []);

  const submitQueue = useCallback(async (): Promise<QueueResult | null> => {
    if (processing) return null;
    setProcessing(true);
    try {
      const result = await processQueue();
      setLastResult(result);
      await refreshDrafts();
      return result;
    } finally {
      setProcessing(false);
    }
  }, [processing, refreshDrafts]);

  useEffect(() => {
    refreshDrafts();

    const handleOnline = () => {
      submitQueue();
    };

    const handleFocus = () => {
      refreshDrafts();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshDrafts, submitQueue]);

  return (
    <DraftContext.Provider
      value={{
        draftCount,
        queuedCount,
        processing,
        lastResult,
        refreshDrafts,
        submitQueue,
      }}
    >
      {children}
    </DraftContext.Provider>
  );
}

export function useDrafts() {
  return useContext(DraftContext);
}