"use client";

import { useEffect, useState } from "react";

const PROBE_TIMEOUT = 4000;

async function probeConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT);
    const res = await fetch("/api/healthz", {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export type Connectivity = {
  isOnline: boolean;
  isChecking: boolean;
};

export function useOnline(): Connectivity {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine,
  );
  const [isChecking, setIsChecking] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine,
  );

  useEffect(() => {
    let active = true;

    const handleOnline = () => {
      setIsChecking(true);
      void (async () => {
        const ok = await probeConnectivity();
        if (active) {
          setIsOnline(ok);
          setIsChecking(false);
        }
      })();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsChecking(false);
    };

    const initial = () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setIsOnline(false);
        setIsChecking(false);
        return;
      }
      void (async () => {
        const ok = await probeConnectivity();
        if (active) {
          setIsOnline(ok);
          setIsChecking(false);
        }
      })();
    };

    initial();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, isChecking };
}