import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/service-role";
import { AdminFeedbackTable } from "./admin-feedback-table";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

const PAGE_SIZE = 20;

async function AdminFeedbackContent({
  statusFilter,
  currentPage,
  totalCount,
}: {
  statusFilter: string;
  currentPage: number;
  totalCount: number;
}) {
  const adminClient = createAdminClient();

  let dataQuery = adminClient
    .from("feedback")
    .select("id, type, title, status, rating, created_at, user_id")
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    dataQuery = dataQuery.eq("status", statusFilter as "OPEN" | "ACKNOWLEDGED" | "CLOSED");
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: feedbackList } = await dataQuery.range(from, to);

  return (
    <AdminFeedbackTable
      feedbackList={feedbackList ?? []}
      currentPage={currentPage}
      totalPages={totalPages}
      statusFilter={statusFilter}
    />
  );
}

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const currentStatus = params.status ?? "all";
  const currentPage = Math.max(1, Number(params.page) || 1);

  const adminClient = createAdminClient();
  let countQuery = adminClient
    .from("feedback")
    .select("*", { count: "exact", head: true });
  if (currentStatus !== "all") {
    countQuery = countQuery.eq("status", currentStatus as "OPEN" | "ACKNOWLEDGED" | "CLOSED");
  }
  const { count } = await countQuery;
  const totalCount = count ?? 0;

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-foreground">
        <MessageSquare className="h-6 w-6 text-primary" />
        Feedback Inbox
        <span className="text-base font-normal text-muted-foreground">
          ({totalCount})
        </span>
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {[
          { value: "all", label: "All" },
          { value: "OPEN", label: "Open" },
          { value: "ACKNOWLEDGED", label: "Acknowledged" },
          { value: "CLOSED", label: "Closed" },
        ].map(({ value, label }) => {
          const isActive = currentStatus === value;
          const href =
            value === "all"
              ? "/admin/feedback"
              : `/admin/feedback?status=${value}`;
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

      <div className="rounded-lg border border-border bg-card">
        <Suspense
          key={`${currentStatus}-${currentPage}`}
          fallback={
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          }
        >
          <AdminFeedbackContent
            statusFilter={currentStatus}
            currentPage={currentPage}
            totalCount={totalCount}
          />
        </Suspense>
      </div>
    </div>
  );
}
