import type { ReactNode } from "react";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { PushSubscriptionManager } from "@/components/push-subscription-manager";
import { OfflineQueueProcessor } from "@/components/offline/offline-queue-processor";
import { OfflineUploadBanner } from "@/components/offline/offline-upload-banner";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CitizenLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNav />
      {user ? <PushSubscriptionManager userId={user.id} /> : null}
      <OfflineQueueProcessor />
      <OfflineUploadBanner />
      <main id="main-content" tabIndex={-1} className="flex-1 bg-radial-glow">{children}</main>
      <PublicFooter />
    </div>
  );
}
