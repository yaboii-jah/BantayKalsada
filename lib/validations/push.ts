import { z } from "zod";

const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "web.push.mozilla.org",
  "updates.push.services.mozilla.org",
  "web.push.apple.com",
  "api.push.apple.com",
  "notify.windows.com",
];

function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const { hostname } = new URL(endpoint);
    return ALLOWED_PUSH_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

export const pushSubscriptionSchema = z
  .object({
    endpoint: z.string().url().refine(isAllowedPushEndpoint, {
      message: "Unsupported push service",
    }),
    expirationTime: z.number().nullish(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  })
  .strict();

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
