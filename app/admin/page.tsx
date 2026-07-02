import { createAdminClient } from "@/lib/supabase/service-role";
import { StatusCountCards } from "@/components/admin/status-count-cards";

export default async function AdminDashboard() {
  const adminClient = createAdminClient();

  const counts = await Promise.all([
    adminClient
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING"),
    adminClient
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "APPROVED"),
    adminClient
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "REJECTED"),
    adminClient
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "RESOLVED"),
  ]);

  const items = [
    {
      label: "Pending Reports",
      count: counts[0].count ?? 0,
      href: "/admin/pending",
      color: "pending" as const,
    },
    {
      label: "Approved Reports",
      count: counts[1].count ?? 0,
      href: "/admin/approved",
      color: "approved" as const,
    },
    {
      label: "Rejected Reports",
      count: counts[2].count ?? 0,
      href: "/admin/rejected",
      color: "rejected" as const,
    },
    {
      label: "Resolved Reports",
      count: counts[3].count ?? 0,
      href: "/admin/resolved",
      color: "resolved" as const,
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Dashboard</h1>
      <StatusCountCards items={items} />
    </div>
  );
}
