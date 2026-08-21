"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Database } from "@/types/database.types";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import { formatReportDate } from "@/lib/date-utils";
import { BulkActionBar } from "@/components/admin/bulk-action-bar";
import {
  bulkApproveReports,
  bulkRejectReports,
  bulkResolveReports,
} from "@/app/admin/actions";
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
  barangay: string | null;
  title: string;
  submitted_at: string;
  submitter_name: string;
  rejection_reason: string | null;
}

interface BulkActions {
  actions: string[];
}

interface QueueTableProps {
  rows: QueueRow[];
  showStatus?: boolean;
  showRejectionReason?: boolean;
  bulkActions?: BulkActions;
}

const categoryLabels: Record<string, string> = {
  POTHOLE: "Pothole",
  FLOODED_ROAD: "Flooded Road",
  ROAD_ACCIDENT: "Road Accident",
  ROAD_RAGE: "Road Rage",
  BROKEN_TRAFFIC_SIGN: "Broken Traffic Sign",
  OTHER: "Other",
};

const barangayLabels: Record<string, string> = {
  DOLORES: "Dolores",
  SAN_ISIDRO: "San Isidro",
  SAN_JUAN: "San Juan",
  SANTA_ANA: "Santa Ana",
  MUZON: "Muzon",
};

export function AdminQueueTable({
  rows,
  showStatus = true,
  showRejectionReason = false,
  bulkActions,
}: QueueTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  }, [allSelected, rows]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const actionHandlers = bulkActions
    ? {
        onApprove: bulkActions.actions.includes("approve") ? bulkApproveReports : async () => ({ success: false, error: "Not available" }),
        onReject: bulkActions.actions.includes("reject") ? bulkRejectReports : async () => ({ success: false, error: "Not available" }),
        onResolve: bulkActions.actions.includes("resolve") ? bulkResolveReports : async () => ({ success: false, error: "Not available" }),
      }
    : null;

  if (rows.length === 0) {
    return null;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {bulkActions && (
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="size-4 cursor-pointer rounded border-border text-primary focus:ring-primary"
                  aria-label="Select all"
                />
              </TableHead>
            )}
            {showStatus && <TableHead>Status</TableHead>}
            <TableHead>Submitter</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="hidden sm:table-cell">Barangay</TableHead>
            <TableHead className="max-w-[200px]">Title</TableHead>
            <TableHead>Date</TableHead>
            {showRejectionReason && (
              <TableHead className="hidden lg:table-cell">Rejection Reason</TableHead>
            )}
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              data-state={selectedIds.has(row.id) ? "selected" : undefined}
            >
              {bulkActions && (
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.id)}
                    onChange={() => toggleSelect(row.id)}
                    className="size-4 cursor-pointer rounded border-border text-primary focus:ring-primary"
                    aria-label={`Select ${row.title}`}
                  />
                </TableCell>
              )}
              {showStatus && (
                <TableCell>
                  <ReportStatusBadge status={row.status} />
                </TableCell>
              )}
              <TableCell className="font-medium">
                {row.submitter_name}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {categoryLabels[row.category] ?? row.category}
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {row.barangay ? (barangayLabels[row.barangay] ?? row.barangay) : "—"}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground">
                {row.title}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatReportDate(row.submitted_at)}
              </TableCell>
              {showRejectionReason && (
                <TableCell className="hidden max-w-[200px] truncate text-muted-foreground lg:table-cell">
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

      {actionHandlers && selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onDeselectAll={deselectAll}
          onApprove={actionHandlers.onApprove}
          onReject={actionHandlers.onReject}
          onResolve={actionHandlers.onResolve}
          selectedIds={Array.from(selectedIds)}
          actions={bulkActions!.actions}
        />
      )}
    </>
  );
}
