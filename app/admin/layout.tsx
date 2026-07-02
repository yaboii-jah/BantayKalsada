import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service-role";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "ADMIN") {
    redirect("/browse");
  }

  const adminClient = createAdminClient();
  const { count: pendingCount } = await adminClient
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("status", "PENDING");

  return (
    <div className="flex min-h-screen">
      <AdminSidebar
        pendingCount={pendingCount ?? 0}
        adminName={profile.full_name}
      />
      <main className="flex-1 bg-muted p-6">{children}</main>
    </div>
  );
}
