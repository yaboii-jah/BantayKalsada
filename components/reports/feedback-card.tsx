import Link from "next/link";
import type { Database } from "@/types/database.types";
import { cn } from "@/lib/utils";
import { formatReportDate } from "@/lib/date-utils";
import { Star, Bug, Lightbulb, MessageSquare } from "lucide-react";

type FeedbackRow = Database["public"]["Tables"]["feedback"]["Row"];

const typeConfig: Record<
  FeedbackRow["type"],
  { label: string; icon: typeof Bug; className: string }
> = {
  BUG_REPORT: {
    label: "Bug Report",
    icon: Bug,
    className: "text-destructive",
  },
  FEATURE_REQUEST: {
    label: "Feature Request",
    icon: Lightbulb,
    className: "text-status-pending",
  },
  GENERAL: {
    label: "General",
    icon: MessageSquare,
    className: "text-primary",
  },
};

const statusConfig: Record<
  FeedbackRow["status"],
  { label: string; className: string }
> = {
  OPEN: {
    label: "Open",
    className: "bg-status-pending/10 text-status-pending border-status-pending/20",
  },
  ACKNOWLEDGED: {
    label: "Acknowledged",
    className: "bg-status-approved/10 text-status-approved border-status-approved/20",
  },
  CLOSED: {
    label: "Closed",
    className: "bg-status-resolved/10 text-status-resolved border-status-resolved/20",
  },
};

export function FeedbackCard({
  feedback,
  className,
}: {
  feedback: FeedbackRow;
  className?: string;
}) {
  const typeInfo = typeConfig[feedback.type];
  const statusInfo = statusConfig[feedback.status];
  const TypeIcon = typeInfo.icon;

  return (
    <Link
      href={`/my-feedback/${feedback.id}`}
      className={cn(
        "group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <TypeIcon className={`size-4 ${typeInfo.className}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {typeInfo.label}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                statusInfo.className,
              )}
            >
              {statusInfo.label}
            </span>
            {feedback.rating && (
              <span className="ml-auto flex items-center gap-0.5 text-xs text-status-pending">
                <Star className="size-3 fill-status-pending" />
                {feedback.rating}/5
              </span>
            )}
          </div>
          <h3 className="mt-1.5 line-clamp-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {feedback.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {feedback.description}
          </p>
          <p className="mt-2 text-xs text-muted-foreground/60">
            {formatReportDate(feedback.created_at)}
          </p>
        </div>
      </div>
    </Link>
  );
}
