import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/service-role";
import { Flag, ArrowRight } from "lucide-react";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";

export const dynamic = "force-dynamic";

const flagLabels: Record<string, string> = {
  ALREADY_FIXED: "Already fixed",
  WRONG_LOCATION: "Wrong location",
};

export default async function AdminFlagsPage() {
  const adminClient = createAdminClient();

  const { data: flags } = await adminClient
    .from("report_flags")
    .select("id, report_id, flag_type, created_at");

  const flagsByReport = new Map<string, { count: number; types: string[]; latest: string }>();
  for (const flag of flags ?? []) {
    const entry = flagsByReport.get(flag.report_id) ?? { count: 0, types: [], latest: "" };
    entry.count += 1;
    entry.types.push(flag.flag_type);
    if (!entry.latest || flag.created_at > entry.latest) {
      entry.latest = flag.created_at;
    }
    flagsByReport.set(flag.report_id, entry);
  }

  const reportIds = [...flagsByReport.keys()];
  const { data: reports } = reportIds.length
    ? await adminClient
        .from("reports")
        .select("id, title, status, category")
        .in("id", reportIds)
    : { data: null };

  const reportMap = new Map(reports?.map((r) => [r.id, r]) ?? []);
  const rows = reportIds
    .map((id) => {
      const report = reportMap.get(id);
      const entry = flagsByReport.get(id);
      if (!report || !entry) return null;
      return { report, ...entry };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => (a.latest < b.latest ? 1 : -1));

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex min-w-0 items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
          <Flag className="h-6 w-6 shrink-0 text-yellow-600" />
          <span className="truncate">Flagged Reports</span>
          {rows.length > 0 && (
            <span className="shrink-0 text-base font-normal text-muted-foreground">
              ({rows.length})
            </span>
          )}
        </h1>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Flag className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground">
            No flagged reports
          </p>
          <p className="text-sm text-muted-foreground">
            Citizens have not flagged any reports for review.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <ul className="divide-y divide-border">
            {rows.map(({ report, count, types, latest }) => (
              <li key={report.id}>
                <Link
                  href={`/admin/reports/${report.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-foreground">
                        {report.title}
                      </span>
                      <ReportStatusBadge status={report.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[...new Set(types)].map((t) => flagLabels[t] ?? t).join(", ")} ·{" "}
                      {count} flag{count === 1 ? "" : "s"} · latest{" "}
                      {new Date(latest).toLocaleDateString("fil-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
