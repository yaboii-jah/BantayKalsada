import { createAdminClient } from "@/lib/supabase/service-role";
import { AdminQueueTable } from "@/components/admin/admin-queue-table";
import { AdminListPending } from "@/components/admin/admin-list-pending";
import {
  parseReportFilterParams,
  hasReportFilters,
} from "@/lib/admin-report-filters";
import { XCircle, Download } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; category?: string; barangay?: string }>;
}

export default async function AdminRejectedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseReportFilterParams(params);
  const currentPage = Math.max(1, Number(params.page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const adminClient = createAdminClient();

  let countQuery = adminClient
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("status", "REJECTED");
  if (filters.q) countQuery = countQuery.ilike("title", `%${filters.q}%`);
  if (filters.category) countQuery = countQuery.eq("category", filters.category);
  if (filters.barangay) countQuery = countQuery.eq("barangay", filters.barangay);

  const { count: totalCount } = await countQuery;

  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

  let dataQuery = adminClient
    .from("reports")
    .select("id, status, category, barangay, title, submitted_at, submitted_by_id, rejection_reason")
    .eq("status", "REJECTED");
  if (filters.q) dataQuery = dataQuery.ilike("title", `%${filters.q}%`);
  if (filters.category) dataQuery = dataQuery.eq("category", filters.category);
  if (filters.barangay) dataQuery = dataQuery.eq("barangay", filters.barangay);

  const { data: reports } = await dataQuery
    .order("submitted_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const submitterIds = [...new Set(reports?.map((r) => r.submitted_by_id) ?? [])];

  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, full_name")
    .in("id", submitterIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) ?? []);

  const rows = (reports ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    category: r.category,
    barangay: r.barangay,
    title: r.title,
    submitted_at: r.submitted_at,
    submitter_name: profileMap.get(r.submitted_by_id) ?? "Unknown",
    rejection_reason: r.rejection_reason,
  }));

  return (
    <div className="pb-20">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex min-w-0 items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
          <XCircle className="h-6 w-6 shrink-0 text-status-rejected" />
          <span className="truncate">Rejected Reports</span>
          {totalCount !== null && (
            <span className="shrink-0 text-base font-normal text-muted-foreground">
              ({totalCount})
            </span>
          )}
        </h1>
        {totalCount !== null && totalCount > 0 && (
          <a
            href="/api/admin/export?status=REJECTED"
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        )}
      </div>
      <AdminListPending
        search={filters.q ?? ""}
        category={filters.category ?? ""}
        barangay={filters.barangay ?? ""}
        currentPage={currentPage}
        totalPages={totalPages}
      >
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <XCircle className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">
              {hasReportFilters(filters) ? "No matching reports" : "No rejected reports"}
            </p>
            <p className="text-sm text-muted-foreground">
              {hasReportFilters(filters)
                ? "Try adjusting your search or filters."
                : "Rejected reports will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <AdminQueueTable rows={rows} showRejectionReason />
          </div>
        )}
      </AdminListPending>
    </div>
  );
}
