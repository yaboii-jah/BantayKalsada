import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service-role";
import { AccountForm } from "./account-form";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone, sms_notifications")
    .eq("id", user.id)
    .single();

  const adminClient = createAdminClient();
  const { count: pushSubCount } = await adminClient
    .from("push_subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-foreground">Account Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your notification preferences and contact information.
      </p>

      <div className="mt-8 space-y-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-medium text-foreground">Profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="text-foreground">{profile?.full_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-foreground">{profile?.email ?? user.email}</dd>
            </div>
          </dl>
        </div>

        <AccountForm
          currentPhone={profile?.phone ?? null}
          currentSmsNotifications={profile?.sms_notifications ?? false}
          pushSubscribed={(pushSubCount ?? 0) > 0}
          userId={user.id}
        />
      </div>
    </div>
  );
}