import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

interface SwNotifOptions extends NotificationOptions {
  vibrate?: number[];
}

interface SwNotifOptions extends NotificationOptions {
  vibrate?: number[];
}

interface SwClient {
  url: string;
  focus(): Promise<SwClient>;
}

interface SwClients {
  matchAll(options?: { type?: string; includeUncontrolled?: boolean }): Promise<SwClient[]>;
  openWindow(url: string): Promise<Window | null>;
}

interface Swr {
  showNotification(title: string, options?: SwNotifOptions): Promise<void>;
}

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[];
    registration: Swr;
    clients: SwClients;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

interface PushData {
  title?: string;
  body?: string;
  url?: string;
}

interface PushMessageData {
  json(): PushData;
  text(): string;
}

interface PushMessageEvent extends Event {
  data: PushMessageData | null;
  waitUntil(promise: Promise<unknown>): void;
}

interface ClickNotificationEvent extends Event {
  notification: Notification;
  waitUntil(promise: Promise<unknown>): void;
}

self.addEventListener("push", (event) => {
  const pushEvent = event as PushMessageEvent;
  if (!pushEvent.data) return;

  try {
    const { title, body, url }: PushData = pushEvent.data.json();

    pushEvent.waitUntil(
      self.registration.showNotification(title ?? "Bantay Kalsada", {
        body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        data: { url },
        vibrate: [200, 100, 200],
      }),
    );
  } catch {
    const text = pushEvent.data.text();
    pushEvent.waitUntil(
      self.registration.showNotification("Bantay Kalsada", {
        body: text,
        icon: "/icons/icon-192x192.png",
      }),
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  const notifEvent = event as ClickNotificationEvent;
  notifEvent.notification.close();

  const url = notifEvent.notification.data?.url ?? "/";

  notifEvent.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
