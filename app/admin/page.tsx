import { createAdminClient } from "@/lib/supabase/service-role";
import { StatusCountCards } from "@/components/admin/status-count-cards";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import type { AnalyticsData } from "@/components/admin/analytics-charts";
import { Download } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  POTHOLE: "Pothole",
  FLOODED_ROAD: "Flooded Road",
  ROAD_ACCIDENT: "Road Accident",
  ROAD_RAGE: "Road Rage",
  OTHER: "Other",
};

const BARANGAY_LABELS: Record<string, string> = {
  DOLORES: "Dolores",
  SAN_ISIDRO: "San Isidro",
  SAN_JUAN: "San Juan",
  SANTA_ANA: "Santa Ana",
  MUZON: "Muzon",
};

export default async function AdminDashboard() {
  const adminClient = createAdminClient();

  const { data: allReports } = await adminClient
    .from("reports")
    .select("submitted_at, category, status, resolved_at, barangay");

  const reports = allReports ?? [];

  const pending = reports.filter((r) => r.status === "PENDING").length;
  const approved = reports.filter((r) => r.status === "APPROVED").length;
  const rejected = reports.filter((r) => r.status === "REJECTED").length;
  const resolved = reports.filter((r) => r.status === "RESOLVED").length;

  const items = [
    {
      label: "Pending Reports",
      count: pending,
      href: "/admin/pending",
      color: "pending" as const,
    },
    {
      label: "Approved Reports",
      count: approved,
      href: "/admin/approved",
      color: "approved" as const,
    },
    {
      label: "Rejected Reports",
      count: rejected,
      href: "/admin/rejected",
      color: "rejected" as const,
    },
    {
      label: "Resolved Reports",
      count: resolved,
      href: "/admin/resolved",
      color: "resolved" as const,
    },
  ];

  function phDate(d: Date): string {
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  }

  const dailyMap: Record<string, number> = {};
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dailyMap[phDate(d)] = 0;
  }
  reports.forEach((r) => {
    const key = phDate(new Date(r.submitted_at));
    if (key in dailyMap) dailyMap[key]++;
  });
  const dailySubmissions = Object.entries(dailyMap).map(([date, count]) => ({
    date,
    count,
  }));

  const catMap: Record<string, number> = {};
  reports.forEach((r) => {
    catMap[r.category] = (catMap[r.category] ?? 0) + 1;
  });
  const categoryCounts = Object.entries(catMap)
    .map(([category, count]) => ({
      category: CATEGORY_LABELS[category] ?? category,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const barangayMap: Record<string, number> = {};
  reports.forEach((r) => {
    const b = r.barangay ?? "UNKNOWN";
    barangayMap[b] = (barangayMap[b] ?? 0) + 1;
  });
  const barangayCounts = Object.entries(barangayMap)
    .map(([barangay, count]) => ({
      barangay: BARANGAY_LABELS[barangay] ?? barangay,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const statusCounts = [
    { status: "PENDING", count: pending },
    { status: "APPROVED", count: approved },
    { status: "REJECTED", count: rejected },
    { status: "RESOLVED", count: resolved },
  ];

  const totalReviewed = approved + rejected;
  const approvalRate =
    totalReviewed > 0 ? Math.round((approved / totalReviewed) * 100) : 0;

  const resolvedReports = reports.filter(
    (r): r is typeof r & { resolved_at: string } =>
      r.status === "RESOLVED" && r.resolved_at !== null,
  );
  let totalHours = 0;
  resolvedReports.forEach((r) => {
    const submitted = new Date(r.submitted_at).getTime();
    const resolvedAt = new Date(r.resolved_at).getTime();
    totalHours += (resolvedAt - submitted) / (1000 * 60 * 60);
  });
  const avgResolutionHours =
    resolvedReports.length > 0
      ? Math.round(totalHours / resolvedReports.length)
      : 0;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const reportsThisMonth = reports.filter(
    (r) => r.submitted_at >= monthStart,
  ).length;

  const analyticsData: AnalyticsData = {
    dailySubmissions,
    categoryCounts,
    statusCounts,
    barangayCounts,
    approvalRate,
    avgResolutionHours,
    reportsThisMonth,
    totalReports: reports.length,
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <a
          href="/api/admin/export"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Export All CSV
        </a>
      </div>
      <StatusCountCards items={items} />
      <AnalyticsCharts data={analyticsData} />
    </div>
  );
}
