import { Suspense } from "react";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportCard } from "@/components/reports/report-card";
import { FilterBar } from "@/components/browse/filter-bar";
import { PaginationBar } from "@/components/browse/pagination-bar";
import { BrowseMapWrapper } from "@/components/browse/browse-map-wrapper";
import { ReportsGridSkeleton, MapSkeleton } from "@/components/reports/reports-grid-skeleton";
import { severityWeight, type HeatPoint } from "@/lib/heatmap";
import { sanitizeSearchTerm } from "@/lib/api-reports";
import { Map } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database.types";

const PAGE_SIZE = 12;

export const metadata: Metadata = {
  title: "Browse road hazard reports — Bantay Kalsada",
  description:
    "Browse verified road hazard reports submitted by the community in Taytay, Rizal. Filter by category, status, barangay, or search.",
  alternates: {
    canonical: "/browse",
  },
  openGraph: {
    title: "Browse road hazard reports — Bantay Kalsada",
    description:
      "Browse verified road hazard reports submitted by the community in Taytay, Rizal.",
    type: "website",
    url: "/browse",
  },
  twitter: {
    title: "Browse road hazard reports — Bantay Kalsada",
    description:
      "Browse verified road hazard reports submitted by the community in Taytay, Rizal.",
  },
};

async function BrowseReports({
  categoryFilter,
  statusFilter,
  barangayFilter,
  query,
  view,
  currentPage,
}: {
  categoryFilter: string;
  statusFilter: string;
  barangayFilter: string;
  query: string;
  view: "grid" | "map";
  currentPage: number;
}) {
  const supabase = await createSupabaseServerClient();

  let countQuery = supabase
    .from("reports")
    .select("*", { count: "exact", head: true });

  let dataQuery = supabase
    .from("reports")
    .select("*")
    .order("submitted_at", { ascending: false });

  const baseStatusFilter = ["APPROVED", "RESOLVED"];

  if (statusFilter !== "all") {
    countQuery = countQuery.in("status", [statusFilter]);
    dataQuery = dataQuery.in("status", [statusFilter]);
  } else {
    countQuery = countQuery.in("status", baseStatusFilter);
    dataQuery = dataQuery.in("status", baseStatusFilter);
  }

  if (categoryFilter !== "all") {
    countQuery = countQuery.eq("category", categoryFilter);
    dataQuery = dataQuery.eq("category", categoryFilter);
  }

  if (barangayFilter !== "all") {
    countQuery = countQuery.eq("barangay", barangayFilter);
    dataQuery = dataQuery.eq("barangay", barangayFilter);
  }

  const safeQuery = query ? sanitizeSearchTerm(query) : "";

  if (safeQuery) {
    const pattern = `%${safeQuery}%`;
    const ilikeFilter = `title.ilike.${pattern},description.ilike.${pattern}`;
    countQuery = countQuery.or(ilikeFilter);
    dataQuery = dataQuery.or(ilikeFilter);
  }

  const { count } = await countQuery;

  let pageReports: Database["public"]["Tables"]["reports"]["Row"][] = [];
  let totalCount = count ?? 0;

  let heatPoints: HeatPoint[] = [];

  if (view === "map") {
    const { data: allData } = await dataQuery;
    pageReports = allData ?? [];
    totalCount = pageReports.length;

    // Unfiltered hazard density across all of Taytay (APPROVED/RESOLVED only).
    // Ignores the active filters by design — the heatmap shows overall concentration.
    const { data: heatData } = await supabase
      .from("reports")
      .select("latitude, longitude, severity")
      .in("status", baseStatusFilter);

    heatPoints = (heatData ?? []).map(
      (r) => [r.latitude, r.longitude, severityWeight(r.severity)] as HeatPoint,
    );
  } else {
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data: reportsData } = await dataQuery.range(from, to);
    pageReports = reportsData ?? [];
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function buildHref(page: number) {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (view === "map") p.set("view", "map");
    if (categoryFilter && categoryFilter !== "all") p.set("category", categoryFilter);
    if (statusFilter && statusFilter !== "all") p.set("status", statusFilter);
    if (barangayFilter && barangayFilter !== "all") p.set("barangay", barangayFilter);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    return `/browse${qs ? `?${qs}` : ""}`;
  }

  const isFiltered =
    !!query ||
    (categoryFilter && categoryFilter !== "all") ||
    (statusFilter && statusFilter !== "all") ||
    (barangayFilter && barangayFilter !== "all");

  if (view === "map" && (pageReports.length > 0 || heatPoints.length > 0)) {
    return (
      <>
        <BrowseMapWrapper
          reports={pageReports.map((r) => ({
            id: r.id,
            title: r.title,
            category: r.category,
            status: r.status,
            latitude: r.latitude,
            longitude: r.longitude,
            photo_urls: r.photo_urls,
          }))}
          heatPoints={heatPoints}
        />
      </>
    );
  }

  if (view === "grid" && pageReports.length > 0) {
    return (
      <>
        <p className="mb-4 text-sm text-muted-foreground">
          {totalCount} {totalCount === 1 ? "report" : "reports"}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {pageReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
        {totalPages > 1 && (
          <div className="mt-8">
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              buildHref={buildHref}
            />
          </div>
        )}
      </>
    );
  }

  return (
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
          <Button variant="outline" className="mt-6" asChild>
            <Link href="/browse">Clear all filters</Link>
          </Button>
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
          <Button className="mt-6" asChild>
            <Link href="/submit">Submit a report</Link>
          </Button>
        </>
      )}
    </div>
  );
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string; barangay?: string; page?: string; q?: string; view?: string }>;
}) {
  const params = await searchParams;
  const categoryFilter = params.category ?? "all";
  const statusFilter = params.status ?? "all";
  const barangayFilter = params.barangay ?? "all";
  const query = params.q?.trim() ?? "";
  const view = params.view === "map" ? "map" : "grid";
  const currentPage = Math.max(1, Number(params.page) || 1);

  const suspenseKey = `${view}-${categoryFilter}-${statusFilter}-${barangayFilter}-${query}-${currentPage}`;

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
        <Button className="w-full sm:w-auto" asChild>
          <Link href="/submit">Submit a report</Link>
        </Button>
      </div>

      <div className="mb-6">
        <Suspense fallback={null}>
          <FilterBar view={view} />
        </Suspense>
      </div>

      <Suspense
        key={suspenseKey}
        fallback={view === "map" ? <MapSkeleton /> : <ReportsGridSkeleton />}
      >
        <BrowseReports
          categoryFilter={categoryFilter}
          statusFilter={statusFilter}
          barangayFilter={barangayFilter}
          query={query}
          view={view}
          currentPage={currentPage}
        />
      </Suspense>
    </div>
  );
}
