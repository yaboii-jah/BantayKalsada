import { createAdminClient } from "@/lib/supabase/service-role";
import { AdminQueueTable } from "@/components/admin/admin-queue-table";
import { PaginationBar } from "@/components/browse/pagination-bar";
import { CheckCircle, Download } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminApprovedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const adminClient = createAdminClient();

  const { count: totalCount } = await adminClient
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("status", "APPROVED");

  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

  const { data: reports } = await adminClient
    .from("reports")
    .select("id, status, category, barangay, title, submitted_at, submitted_by_id, rejection_reason")
    .eq("status", "APPROVED")
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <CheckCircle className="h-6 w-6 text-status-approved" />
          Approved Reports
          {totalCount !== null && (
            <span className="text-base font-normal text-muted-foreground">
              ({totalCount})
            </span>
          )}
        </h1>
        {totalCount !== null && totalCount > 0 && (
          <a
            href="/api/admin/export?status=APPROVED"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <CheckCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground">
            No approved reports
          </p>
          <p className="text-sm text-muted-foreground">
            Approved reports will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card">
            <AdminQueueTable
              rows={rows}
              bulkActions={{ actions: ["resolve"] }}
            />
          </div>
          <div className="mt-4">
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              buildHref={(page) => `/admin/approved?page=${page}`}
            />
          </div>
        </>
      )}
    </div>
  );
}
