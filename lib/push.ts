import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/service-role";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const vapidSubject =
  process.env.VAPID_SUBJECT ?? "mailto:admin@bantay-kalsada.app";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export function getVapidPublicKey(): string {
  return vapidPublicKey;
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  url: string,
): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) return;

  const adminClient = createAdminClient();
  const { data: subscriptions } = await adminClient
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", userId);

  if (!subscriptions || subscriptions.length === 0) return;

  const payload = JSON.stringify({ title, body, url });
  const expiredIds: string[] = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        sub.subscription as unknown as webpush.PushSubscription,
        payload,
      );
    } catch (err) {
      if (err instanceof webpush.WebPushError) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredIds.push(sub.id);
        } else {
          console.error(
            `Push send failed (status ${err.statusCode}):`,
            err.message,
          );
        }
      } else {
        console.error("Push send failed:", err);
      }
    }
  }

  if (expiredIds.length > 0) {
    await adminClient
      .from("push_subscriptions")
      .delete()
      .in("id", expiredIds);
  }
}
