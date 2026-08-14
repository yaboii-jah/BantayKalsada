"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    serwist?: { register: () => void };
  }
}

function subscribeToStandalone(callback: () => void) {
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getStandaloneSnapshot() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

function getStandaloneServerSnapshot() {
  return false;
}

const DISMISSED_KEY = "bk-install-prompt-dismissed";
const DISMISS_EVENT = "bk-install-prompt-dismissed";

function subscribeToDismissed(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(DISMISS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(DISMISS_EVENT, callback);
  };
}

function getDismissedSnapshot() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function getDismissedServerSnapshot() {
  return false;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const isStandalone = useSyncExternalStore(
    subscribeToStandalone,
    getStandaloneSnapshot,
    getStandaloneServerSnapshot,
  );
  const isDismissed = useSyncExternalStore(
    subscribeToDismissed,
    getDismissedSnapshot,
    getDismissedServerSnapshot,
  );

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const handleInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    const event = deferredPrompt as unknown as {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore storage failures
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  };

  if (isStandalone || !showPrompt || isDismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1300] border-t border-border bg-card p-4 shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Download className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Install Bantay Kalsada</p>
            <p className="text-xs text-muted-foreground">Add to your home screen for quick access</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleInstall}>
            Install
          </Button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
