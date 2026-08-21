"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { ActionButtons } from "@/components/admin/action-buttons";
import { DuplicateManager } from "@/components/admin/duplicate-manager";
import { buttonVariants } from "@/components/ui/button";
import { approveReport, rejectReport, resolveReport } from "../../actions";
import type { Database } from "@/types/database.types";

type ReportStatus = Database["public"]["Enums"]["report_status"];

export function AdminReportActions({
  reportId,
  status,
  duplicateOfId,
}: {
  reportId: string;
  status: ReportStatus;
  duplicateOfId: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-4 border-t border-border pt-4 pb-2">
      <DuplicateManager
        reportId={reportId}
        duplicateOfId={duplicateOfId}
        className="mr-auto"
      />
      <Link
        href={`/admin/reports/${reportId}/edit`}
        className={buttonVariants({
          variant: "outline",
          size: "lg",
          className: "w-full sm:w-auto",
        })}
      >
        <Pencil className="size-4" />
        Edit report
      </Link>
      <ActionButtons
        reportId={reportId}
        status={status}
        onApprove={approveReport}
        onReject={rejectReport}
        onResolve={(id, notes, urls) => resolveReport(id, notes, urls)}
      />
    </div>
  );
}
