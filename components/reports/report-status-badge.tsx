import type { Database } from "@/types/database.types";
import { cn } from "@/lib/utils";

type Status = Database["public"]["Enums"]["report_status"];

const statusConfig: Record<Status, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-status-pending/10 text-status-pending border-status-pending/20",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-status-approved/10 text-status-approved border-status-approved/20",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-status-rejected/10 text-status-rejected border-status-rejected/20",
  },
  RESOLVED: {
    label: "Resolved",
    className: "bg-status-resolved/10 text-status-resolved border-status-resolved/20",
  },
};

export function ReportStatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
