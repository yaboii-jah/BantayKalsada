import { Suspense } from "react";
import { MOCK_REPORTS } from "@/lib/mock-data";
import { ReportCard } from "@/components/reports/report-card";
import { FilterBar } from "@/components/browse/filter-bar";
import { PaginationBar } from "@/components/browse/pagination-bar";
import { Map } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 12;

const categoryLabels: Record<string, string> = {
  POTHOLE: "Pothole",
  FLOODED_ROAD: "Flooded Road",
  ROAD_ACCIDENT: "Road Accident",
  ROAD_RAGE: "Road Rage",
  OTHER: "Other",
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const categoryFilter = params.category ?? "all";
  const statusFilter = params.status ?? "all";
  const currentPage = Math.max(1, Number(params.page) || 1);

  let filtered = [...MOCK_REPORTS];

  if (categoryFilter && categoryFilter !== "all") {
    filtered = filtered.filter((r) => r.category === categoryFilter);
  }

  if (statusFilter && statusFilter !== "all") {
    filtered = filtered.filter((r) => r.status === statusFilter);
  }

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageReports = filtered.slice(start, start + PAGE_SIZE);

  function buildHref(page: number) {
    const p = new URLSearchParams();
    if (categoryFilter && categoryFilter !== "all") p.set("category", categoryFilter);
    if (statusFilter && statusFilter !== "all") p.set("status", statusFilter);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    return `/browse${qs ? `?${qs}` : ""}`;
  }

  const isFiltered =
    (categoryFilter && categoryFilter !== "all") ||
    (statusFilter && statusFilter !== "all");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Road hazard reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse verified road incident reports submitted by the community.
          </p>
        </div>
        <Link href="/submit">
          <Button className="w-full sm:w-auto">Submit a report</Button>
        </Link>
      </div>

      <div className="mb-6">
        <Suspense fallback={null}>
          <FilterBar totalCount={totalCount} />
        </Suspense>
      </div>

      {pageReports.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {pageReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
          <div className="mb-6 inline-flex size-16 items-center justify-center rounded-2xl bg-muted">
            <Map className="size-8 text-muted-foreground" />
          </div>
          {isFiltered ? (
            <>
              <h2 className="text-lg font-semibold text-foreground">
                No reports match your filters
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try changing or clearing the filters to see more reports.
              </p>
              <Link href="/browse" className="mt-6">
                <Button variant="outline">Clear all filters</Button>
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-foreground">
                No reports yet
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                There are no road hazard reports to show right now. Be the first
                to report an issue in your community.
              </p>
              <Link href="/submit" className="mt-6">
                <Button>Submit a report</Button>
              </Link>
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
