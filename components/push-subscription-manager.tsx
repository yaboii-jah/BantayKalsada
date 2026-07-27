"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface PushSubscriptionManagerProps {
  userId: string;
}

export function PushSubscriptionManager({
  userId,
}: PushSubscriptionManagerProps) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      return;
    }

    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager
        .getSubscription()
        .then((existingSubscription) => {
          if (existingSubscription) {
            saveSubscription(userId, JSON.parse(JSON.stringify(existingSubscription)));
          }
        });
    });
  }, [userId]);

  return null;
}

export async function requestPushSubscription(
  userId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { success: false, error: "Push notifications are not supported in this browser" };
  }

  if (Notification.permission === "denied") {
    return {
      success: false,
      error: "Push notifications were blocked. Update your browser settings to enable them.",
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { success: false, error: "Permission was denied" };
  }

  try {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "Service worker not available. Try reloading or running the production build (npm run build && npm start).",
              ),
            ),
          15000,
        ),
      ),
    ]);
    const publicKeyVapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKeyVapid) {
      return { success: false, error: "Push is not configured on the server" };
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKeyVapid) as BufferSource,
    });

    await saveSubscription(userId, JSON.parse(JSON.stringify(subscription)));
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to subscribe to push",
    };
  }
}

export async function unsubscribeFromPush(
  userId: string,
): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }

  const supabase = createSupabaseBrowserClient();
  await supabase.from("push_subscriptions").delete().eq("user_id", userId);
}

async function saveSubscription(
  userId: string,
  subscription: PushSubscriptionJSON,
): Promise<void> {
  const { savePushSubscription } = await import("@/app/actions");
  await savePushSubscription(userId, subscription);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData.split("").map((c) => c.charCodeAt(0)));
}
