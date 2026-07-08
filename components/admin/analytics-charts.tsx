"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#d97706",
  APPROVED: "#16a34a",
  REJECTED: "#dc2626",
  RESOLVED: "#2563eb",
};

const CATEGORY_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RESOLVED: "Resolved",
};

type DailyEntry = { date: string; count: number };
type CategoryEntry = { category: string; count: number };
type StatusEntry = { status: string; count: number };

export interface AnalyticsData {
  dailySubmissions: DailyEntry[];
  categoryCounts: CategoryEntry[];
  statusCounts: StatusEntry[];
  approvalRate: number;
  avgResolutionHours: number;
  reportsThisMonth: number;
  totalReports: number;
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/60">{sub}</p>}
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-medium text-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function AnalyticsCharts({ data }: { data: AnalyticsData }) {
  return (
    <div className="mt-10">
      <h2 className="mb-6 text-xl font-semibold text-foreground">Analytics</h2>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Approval Rate"
          value={`${data.approvalRate}%`}
          sub={`${data.statusCounts.find((s) => s.status === "APPROVED")?.count ?? 0} approved, ${data.statusCounts.find((s) => s.status === "REJECTED")?.count ?? 0} rejected`}
        />
        <MetricCard
          label="Avg Resolution Time"
          value={data.avgResolutionHours > 0 ? `${data.avgResolutionHours}h` : "—"}
          sub="From submission to resolved"
        />
        <MetricCard
          label="Total Reports"
          value={data.totalReports}
        />
        <MetricCard
          label="Reports This Month"
          value={data.reportsThisMonth}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Reports Submitted (Last 30 Days)">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.dailySubmissions}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                tickFormatter={(v: string) => v.slice(5)}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-popover)",
                  color: "var(--color-popover-foreground)",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#areaFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By Category">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={data.categoryCounts}
              layout="vertical"
              margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                horizontal={false}
              />
              <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 11, fill: "var(--color-foreground)" }}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-popover)",
                  color: "var(--color-popover-foreground)",
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.categoryCounts.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Distribution">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.statusCounts.map((s) => ({
                  ...s,
                  label: STATUS_LABELS[s.status] ?? s.status,
                }))}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.statusCounts.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] ?? "var(--color-muted)"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-popover)",
                  color: "var(--color-popover-foreground)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {data.statusCounts.map((entry) => (
              <div key={entry.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[entry.status] ?? "var(--color-muted)" }}
                />
                {STATUS_LABELS[entry.status] ?? entry.status}: {entry.count}
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
