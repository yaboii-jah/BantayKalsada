"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, MessageCircle, Send, Loader2, BellRing } from "lucide-react";
import { updateProfileSettings, sendTestSms } from "@/app/actions";
import {
  requestPushSubscription,
  unsubscribeFromPush,
} from "@/components/push-subscription-manager";

interface AccountFormProps {
  currentPhone: string | null;
  currentSmsNotifications: boolean;
  pushSubscribed: boolean;
  userId: string;
}

export function AccountForm({
  currentPhone,
  currentSmsNotifications,
  pushSubscribed,
  userId,
}: AccountFormProps) {
  const router = useRouter();
  const [testing, setTesting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const data = new FormData(form);

      const phoneRaw = (data.get("phone") as string) || "";
      const smsNotifications = data.get("sms_notifications") === "on";

      const result = await updateProfileSettings({
        phone: phoneRaw || null,
        sms_notifications: smsNotifications,
      });

      if (result.success) {
        toast.success("Settings saved");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to save settings");
      }
    },
    [router],
  );

  const [pushBusy, setPushBusy] = useState(false);

  const handleTogglePush = useCallback(async () => {
    setPushBusy(true);
    if (pushSubscribed) {
      await unsubscribeFromPush(userId);
      toast.success("Push notifications disabled");
    } else {
      const result = await requestPushSubscription(userId);
      if (result.success) {
        toast.success("Push notifications enabled");
      } else {
        toast.error(result.error);
      }
    }
    setPushBusy(false);
  }, [pushSubscribed, userId]);

  const handleTestSms = useCallback(async () => {
    setTesting(true);
    const result = await sendTestSms();
    setTesting(false);

    if (result.success) {
      toast.success("Test SMS sent! Check your phone.");
    } else {
      toast.error(result.error ?? "Failed to send test SMS");
    }
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-medium text-foreground">SMS Notifications</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Receive SMS alerts when your reports are approved, rejected, or resolved.
        </p>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              Mobile Number
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="09XXXXXXXXX"
              defaultValue={currentPhone ?? ""}
              className="max-w-sm"
            />
            <p className="text-xs text-muted-foreground">
              Philippine mobile number. Used for SMS alerts only.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 size-4 text-muted-foreground shrink-0" />
              <div>
                <Label htmlFor="sms_notifications" className="text-sm font-medium cursor-pointer">
                  Enable SMS notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Get text messages for report status changes.
                </p>
              </div>
            </div>
            <input
              id="sms_notifications"
              name="sms_notifications"
              type="checkbox"
              defaultChecked={currentSmsNotifications}
              className="size-4 accent-primary"
            />
          </div>
        </div>

        <div className="mt-6 space-y-5 pt-6 border-t border-border">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="flex items-start gap-3">
              <BellRing className="mt-0.5 size-4 text-muted-foreground shrink-0" />
              <div>
                <Label className="text-sm font-medium cursor-pointer">
                  Push notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive browser push alerts for report status changes.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant={pushSubscribed ? "secondary" : "default"}
              size="sm"
              disabled={pushBusy}
              onClick={handleTogglePush}
            >
              {pushBusy ? (
                <Loader2 className="mr-1 size-3.5 animate-spin" />
              ) : null}
              {pushSubscribed ? "Disable" : "Enable"}
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button type="submit" className="w-full sm:w-auto">
            Save Settings
          </Button>
          {currentPhone && (
            <Button
              type="button"
              variant="secondary"
              disabled={testing}
              onClick={handleTestSms}
              className="w-full sm:w-auto"
            >
              {testing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              Send Test SMS
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}