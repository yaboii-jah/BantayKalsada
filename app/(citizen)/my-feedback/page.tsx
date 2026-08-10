import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FeedbackCard } from "@/components/reports/feedback-card";
import { PaginationBar } from "@/components/browse/pagination-bar";
import { ReportsGridSkeleton } from "@/components/reports/reports-grid-skeleton";
import { BackButton } from "@/components/back-button";
import { FileText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 12;

async function MyFeedbackContent({
  statusFilter,
  currentPage,
}: {
  statusFilter: string;
  currentPage: number;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/my-feedback");

  let countQuery = supabase
    .from("feedback")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  let dataQuery = supabase
    .from("feedback")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    countQuery = countQuery.eq("status", statusFilter as "OPEN" | "ACKNOWLEDGED" | "CLOSED");
    dataQuery = dataQuery.eq("status", statusFilter as "OPEN" | "ACKNOWLEDGED" | "CLOSED");
  }

  const { count } = await countQuery;
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: feedbackList } = await dataQuery.range(from, to);

  function buildHref(page: number) {
    const p = new URLSearchParams();
    if (statusFilter !== "all") p.set("status", statusFilter);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    return `/my-feedback${qs ? `?${qs}` : ""}`;
  }

  if (!feedbackList || feedbackList.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center gap-4 py-16">
          <FileText className="size-12 text-muted-foreground" />
          {statusFilter !== "all" ? (
            <>
              <p className="text-sm text-muted-foreground">
                No feedback for this status.
              </p>
              <Button variant="outline" asChild>
                <Link href="/my-feedback">Clear filters</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">
                No feedback yet
              </p>
              <p className="text-sm text-muted-foreground">
                Share your thoughts to help us improve.
              </p>
              <Button asChild>
                <Link href="/feedback">Submit feedback</Link>
              </Button>
            </>
          )}
        </div>
        {totalCount > 0 && (
          <div className="mt-6 flex justify-center text-xs text-muted-foreground">
            {totalCount > PAGE_SIZE && (
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                buildHref={buildHref}
              />
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {feedbackList.map((feedback) => (
          <FeedbackCard key={feedback.id} feedback={feedback} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            buildHref={buildHref}
          />
        </div>
      )}
      <div className="mt-4 text-center text-xs text-muted-foreground">
        Showing {feedbackList.length} of {totalCount} feedback submissions
      </div>
    </>
  );
}

function MyFeedbackFilter({
  currentStatus,
}: {
  currentStatus: string;
}) {
  const statuses = [
    { value: "all", label: "All" },
    { value: "OPEN", label: "Open" },
    { value: "ACKNOWLEDGED", label: "Acknowledged" },
    { value: "CLOSED", label: "Closed" },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {statuses.map(({ value, label }) => {
        const isActive = currentStatus === value;
        const href =
          value === "all" ? "/my-feedback" : `/my-feedback?status=${value}`;
        return (
          <Link
            key={value}
            href={href}
            className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

export default async function MyFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const currentStatus = params.status ?? "all";
  const currentPage = Math.max(1, Number(params.page) || 1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <BackButton fallbackHref="/browse" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Feedback</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your submitted feedback and see responses from the team.
        </p>
      </div>
      <div className="mb-6">
        <MyFeedbackFilter currentStatus={currentStatus} />
      </div>
      <Suspense
        key={`${currentStatus}-${currentPage}`}
        fallback={<ReportsGridSkeleton count={6} />}
      >
        <MyFeedbackContent
          statusFilter={currentStatus}
          currentPage={currentPage}
        />
      </Suspense>
    </div>
  );
}
