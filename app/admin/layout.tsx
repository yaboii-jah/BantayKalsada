import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service-role";
import { AdminShell } from "@/components/admin/admin-shell";

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

  const { data: flaggedReports } = await adminClient
    .from("report_flags")
    .select("report_id");

  const flagsCount = flaggedReports
    ? new Set(flaggedReports.map((f) => f.report_id)).size
    : 0;

  return (
    <AdminShell
      pendingCount={pendingCount ?? 0}
      flagsCount={flagsCount}
      adminName={profile.full_name}
    >
      {children}
    </AdminShell>
  );
}
