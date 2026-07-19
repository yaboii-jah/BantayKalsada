"use client";

import { ActionButtons } from "@/components/admin/action-buttons";
import { approveReport, rejectReport, resolveReport } from "../../actions";
import type { Database } from "@/types/database.types";

type ReportStatus = Database["public"]["Enums"]["report_status"];

export function AdminReportActions({
  reportId,
  status,
}: {
  reportId: string;
  status: ReportStatus;
}) {
  if (status === "REJECTED" || status === "RESOLVED") {
    return null;
  }

  return (
    <div className="flex justify-end border-t border-border pt-6">
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
