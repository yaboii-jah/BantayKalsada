import { createAdminClient } from "@/lib/supabase/service-role";
import { StatusCountCards } from "@/components/admin/status-count-cards";
import { AnalyticsChartsLazy } from "@/components/admin/analytics-charts-lazy";
import type { AnalyticsData } from "@/components/admin/analytics-charts";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

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

const STATUS_KEYS = ["PENDING", "APPROVED", "REJECTED", "RESOLVED"] as const;

interface Aggregates {
  statusCounts: Record<string, number>;
  dailyMap: Record<string, number>;
  categoryCounts: { category: string; count: number }[];
  barangayCounts: { barangay: string; count: number }[];
  approvalRate: number;
  avgResolutionHours: number;
  reportsThisMonth: number;
  totalReports: number;
}

function phDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

function buildDailyMap(days: number): Record<string, number> {
  const dailyMap: Record<string, number> = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dailyMap[phDate(d)] = 0;
  }
  return dailyMap;
}

interface ReportSlice {
  status: string;
  category: string;
  barangay: string | null;
  submitted_at: string;
  resolved_at: string | null;
}

function aggregateInJs(reports: ReportSlice[]): Aggregates {
  const statusCounts: Record<string, number> = {};
  STATUS_KEYS.forEach((k) => (statusCounts[k] = 0));
  reports.forEach((r) => {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
  });

  const dailyMap = buildDailyMap(30);
  reports.forEach((r) => {
    const key = phDate(new Date(r.submitted_at));
    if (key in dailyMap) dailyMap[key]++;
  });

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

  const approved = statusCounts["APPROVED"] ?? 0;
  const rejected = statusCounts["REJECTED"] ?? 0;
  const totalReviewed = approved + rejected;
  const approvalRate =
    totalReviewed > 0 ? Math.round((approved / totalReviewed) * 100) : 0;

  const resolvedReports = reports.filter(
    (r): r is ReportSlice & { resolved_at: string } =>
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

  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();
  const reportsThisMonth = reports.filter(
    (r) => r.submitted_at >= monthStart,
  ).length;

  return {
    statusCounts,
    dailyMap,
    categoryCounts,
    barangayCounts,
    approvalRate,
    avgResolutionHours,
    reportsThisMonth,
    totalReports: reports.length,
  };
}

async function fetchViaRpc(
  adminClient: ReturnType<typeof createAdminClient>,
): Promise<Aggregates | null> {
  try {
    const since30 = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ).toISOString();

    const [statusRes, dailyRes, catRes, brgyRes, avgRes, monthRes] =
      await Promise.all([
        adminClient.rpc("count_reports_by_status"),
        adminClient.rpc("daily_submissions_since", { since: since30 }),
        adminClient.rpc("count_reports_by_category"),
        adminClient.rpc("count_reports_by_barangay"),
        adminClient.rpc("avg_resolution_hours"),
        adminClient.rpc("count_reports_since", { since: monthStart }),
      ]);

    if (statusRes.error || dailyRes.error || catRes.error || brgyRes.error) {
      return null;
    }

    const statusCounts: Record<string, number> = {};
    STATUS_KEYS.forEach((k) => (statusCounts[k] = 0));
    (statusRes.data as { status: string; count: number }[] | null)?.forEach(
      (r) => {
        statusCounts[r.status] = r.count;
      },
    );

    const dailyMap = buildDailyMap(30);
    (dailyRes.data as { day: string; count: number }[] | null)?.forEach((r) => {
      const key = phDate(new Date(`${r.day}T00:00:00Z`));
      if (key in dailyMap) dailyMap[key] = r.count;
    });

    const categoryCounts = (catRes.data as { category: string; count: number }[] | null)
      ?.map((r) => ({ category: CATEGORY_LABELS[r.category] ?? r.category, count: r.count }))
      .sort((a, b) => b.count - a.count) ?? [];

    const barangayCounts = (brgyRes.data as { barangay: string | null; count: number }[] | null)
      ?.map((r) => ({
        barangay: r.barangay ? (BARANGAY_LABELS[r.barangay] ?? r.barangay) : "UNKNOWN",
        count: r.count,
      }))
      .sort((a, b) => b.count - a.count) ?? [];

    const approved = statusCounts["APPROVED"] ?? 0;
    const rejected = statusCounts["REJECTED"] ?? 0;
    const totalReviewed = approved + rejected;

    return {
      statusCounts,
      dailyMap,
      categoryCounts,
      barangayCounts,
      approvalRate: totalReviewed > 0 ? Math.round((approved / totalReviewed) * 100) : 0,
      avgResolutionHours: typeof avgRes.data === "number" ? Math.round(avgRes.data) : 0,
      reportsThisMonth: typeof monthRes.data === "number" ? monthRes.data : 0,
      totalReports: STATUS_KEYS.reduce((sum, k) => sum + (statusCounts[k] ?? 0), 0),
    };
  } catch {
    return null;
  }
}

async function fetchViaLegacy(
  adminClient: ReturnType<typeof createAdminClient>,
): Promise<Aggregates> {
  const { data: allReports } = await adminClient
    .from("reports")
    .select("submitted_at, category, status, resolved_at, barangay");
  return aggregateInJs(allReports ?? []);
}

export default async function AdminDashboard() {
  const adminClient = createAdminClient();

  const aggregates =
    (await fetchViaRpc(adminClient)) ?? (await fetchViaLegacy(adminClient));

  const items = STATUS_KEYS.map((status) => ({
    label:
      status === "PENDING"
        ? "Pending Reports"
        : status === "APPROVED"
          ? "Approved Reports"
          : status === "REJECTED"
            ? "Rejected Reports"
            : "Resolved Reports",
    count: aggregates.statusCounts[status] ?? 0,
    href:
      status === "PENDING"
        ? "/admin/pending"
        : status === "APPROVED"
          ? "/admin/approved"
          : status === "REJECTED"
            ? "/admin/rejected"
            : "/admin/resolved",
    color: status.toLowerCase() as "pending" | "approved" | "rejected" | "resolved",
  }));

  const analyticsData: AnalyticsData = {
    dailySubmissions: Object.entries(aggregates.dailyMap).map(([date, count]) => ({
      date,
      count,
    })),
    categoryCounts: aggregates.categoryCounts,
    statusCounts: STATUS_KEYS.map((status) => ({
      status,
      count: aggregates.statusCounts[status] ?? 0,
    })),
    barangayCounts: aggregates.barangayCounts,
    approvalRate: aggregates.approvalRate,
    avgResolutionHours: aggregates.avgResolutionHours,
    reportsThisMonth: aggregates.reportsThisMonth,
    totalReports: aggregates.totalReports,
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
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
      <AnalyticsChartsLazy data={analyticsData} />
    </div>
  );
}