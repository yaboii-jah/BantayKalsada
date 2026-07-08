import Link from "next/link";
import type { Database } from "@/types/database.types";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import { formatReportDate } from "@/lib/date-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ReportStatus = Database["public"]["Enums"]["report_status"];
type ReportCategory = Database["public"]["Enums"]["report_category"];

export interface QueueRow {
  id: string;
  status: ReportStatus;
  category: ReportCategory;
  title: string;
  submitted_at: string;
  submitter_name: string;
  rejection_reason: string | null;
}

interface QueueTableProps {
  rows: QueueRow[];
  showStatus?: boolean;
  showRejectionReason?: boolean;
}

const categoryLabels: Record<string, string> = {
  POTHOLE: "Pothole",
  FLOODED_ROAD: "Flooded Road",
  ROAD_ACCIDENT: "Road Accident",
  ROAD_RAGE: "Road Rage",
  OmjTHER: "Other",
};

export function AdminQueueTable({
  rows,
  showStatus = true,
  showRejectionReason = false,
}: QueueTableProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showStatus && <TableHead>Status</TableHead>}
          <TableHead>Submitter</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="max-w-[200px]">Title</TableHead>
          <TableHead>Date</TableHead>
          {showRejectionReason && <TableHead>Rejection Reason</TableHead>}
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="cursor-pointer">
            {showStatus && (
              <TableCell>
                <ReportStatusBadge status={row.status} />
              </TableCell>
            )}
            <TableCell className="font-medium">
              {row.submitter_name}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {categoryLabels[row.category] ?? row.category}
            </TableCell>
            <TableCell className="max-w-[200px] truncate text-muted-foreground">
              {row.title}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatReportDate(row.submitted_at)}
            </TableCell>
            {showRejectionReason && (
              <TableCell className="max-w-[200px] truncate text-muted-foreground">
                {row.rejection_reason ?? "—"}
              </TableCell>
            )}
            <TableCell>
              <Link
                href={`/admin/reports/${row.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Review
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
