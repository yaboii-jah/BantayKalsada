import Link from "next/link";
import { PaginationBar } from "@/components/browse/pagination-bar";
import { formatReportDate } from "@/lib/date-utils";
import { MessageSquare } from "lucide-react";
type FeedbackRow = {
  id: string;
  type: string;
  title: string;
  status: string;
  rating: number | null;
  created_at: string;
  user_id: string;
};

const typeLabels: Record<string, string> = {
  BUG_REPORT: "Bug Report",
  FEATURE_REQUEST: "Feature Request",
  GENERAL: "General",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  OPEN: {
    label: "Open",
    className: "bg-status-pending/10 text-status-pending",
  },
  ACKNOWLEDGED: {
    label: "Acknowledged",
    className: "bg-status-approved/10 text-status-approved",
  },
  CLOSED: {
    label: "Closed",
    className: "bg-status-resolved/10 text-status-resolved",
  },
};

interface AdminFeedbackTableProps {
  feedbackList: FeedbackRow[];
  currentPage: number;
  totalPages: number;
  statusFilter: string;
}

export function AdminFeedbackTable({
  feedbackList,
  currentPage,
  totalPages,
  statusFilter,
}: AdminFeedbackTableProps) {
  function buildHref(page: number) {
    const p = new URLSearchParams();
    if (statusFilter !== "all") p.set("status", statusFilter);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    return `/admin/feedback${qs ? `?${qs}` : ""}`;
  }

  if (feedbackList.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <MessageSquare className="size-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No feedback submissions
          {statusFilter !== "all" ? " for this status" : ""}.
        </p>
        {statusFilter !== "all" && (
          <Link
            href="/admin/feedback"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all feedback
          </Link>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {feedbackList.map((feedback) => (
              <tr
                key={feedback.id}
                className="border-b border-border last:border-b-0 hover:bg-muted/30"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/feedback/${feedback.id}`}
                    className="block text-sm text-foreground"
                  >
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {typeLabels[feedback.type]}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/feedback/${feedback.id}`}
                    className="block text-sm font-medium text-foreground hover:text-primary"
                  >
                    {feedback.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/feedback/${feedback.id}`}
                    className="block"
                  >
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                        statusConfig[feedback.status].className
                      }`}
                    >
                      {statusConfig[feedback.status].label}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/feedback/${feedback.id}`}
                    className="block text-sm text-muted-foreground"
                  >
                    {formatReportDate(feedback.created_at)}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
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
