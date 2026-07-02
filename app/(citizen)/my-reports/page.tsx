import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportCard } from "@/components/reports/report-card";
import { MyReportsFilter } from "@/components/reports/my-reports-filter";
import { PaginationBar } from "@/components/browse/pagination-bar";
import { FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 12;

export default async function MyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const currentPage = Math.max(1, Number(params.page) || 1);

  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    notFound();
  }

  let countQuery = supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("submitted_by_id", user.id);

  let dataQuery = supabase
    .from("reports")
    .select("*")
    .eq("submitted_by_id", user.id)
    .order("submitted_at", { ascending: false });

  if (statusFilter !== "all") {
    countQuery = countQuery.eq("status", statusFilter);
    dataQuery = dataQuery.eq("status", statusFilter);
  }

  const { count } = await countQuery;

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: reportsData } = await dataQuery.range(from, to);
  const pageReports = reportsData ?? [];

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function buildHref(page: number) {
    const p = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") p.set("status", statusFilter);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    return `/my-reports${qs ? `?${qs}` : ""}`;
  }

  const isFiltered = statusFilter !== "all";
  const isNewUser = totalCount === 0 && !isFiltered;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">My Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track the status of your submitted road hazard reports.
        </p>
      </div>

      <div className="mb-6">
        <Suspense fallback={null}>
          <MyReportsFilter totalCount={totalCount} />
        </Suspense>
      </div>

      {pageReports.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {pageReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              href={`/my-reports/${report.id}`}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
          <div className="mb-6 inline-flex size-16 items-center justify-center rounded-2xl bg-muted">
            <FileText className="size-8 text-muted-foreground" />
          </div>
          {isNewUser ? (
            <>
              <h2 className="text-lg font-semibold text-foreground">
                No reports yet
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You haven&apos;t submitted any road hazard reports yet. Be the
                first to report an issue in your community.
              </p>
              <Link href="/submit" className="mt-6">
                <Button>Submit a report</Button>
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-foreground">
                No reports for this status
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isFiltered
                  ? "Try selecting a different status filter to see more reports."
                  : "You haven&apos;t submitted any road hazard reports yet."}
              </p>
              {isFiltered && (
                <Link href="/my-reports" className="mt-6">
                  <Button variant="outline">Clear all filters</Button>
                </Link>
              )}
            </>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8">
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            buildHref={buildHref}
          />
        </div>
      )}
    </div>
  );
}
