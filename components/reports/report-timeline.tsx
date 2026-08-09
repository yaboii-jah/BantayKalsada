import { createAdminClient } from "@/lib/supabase/service-role";
import { formatReportDate } from "@/lib/date-utils";
import type { Database } from "@/types/database.types";
import {
  CheckCircle,
  XCircle,
  CheckCheck,
  MessageSquare,
  PenLine,
  Copy,
  Merge,
  FilePlus2,
} from "lucide-react";

type ActivityAction = Database["public"]["Enums"]["report_activity_action"];

interface ReportTimelineProps {
  reportId: string;
  submittedAt: string;
  submittedById: string | null;
  status: string;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  resolvedAt?: string | null;
  rejectionReason?: string | null;
  resolutionNotes?: string | null;
}

interface TimelineEvent {
  id: string;
  at: string;
  actorId: string | null;
  action: ActivityAction;
  detail: Record<string, unknown> | null;
}

const actionLabel: Record<ActivityAction, string> = {
  SUBMITTED: "Report submitted",
  EDITED: "Details updated by administrator",
  APPROVED: "Report approved",
  REJECTED: "Report rejected",
  RESOLVED: "Report marked as resolved",
  DUPLICATE_LINKED: "Marked as a duplicate",
  MERGED: "Merged into another report",
  COMMENT_REMOVED: "A comment was removed",
};

function actionIcon(action: ActivityAction) {
  switch (action) {
    case "SUBMITTED":
      return <FilePlus2 className="size-3.5 text-primary" />;
    case "EDITED":
      return <PenLine className="size-3.5 text-blue-500" />;
    case "APPROVED":
      return <CheckCircle className="size-3.5 text-status-approved" />;
    case "REJECTED":
      return <XCircle className="size-3.5 text-status-rejected" />;
    case "RESOLVED":
      return <CheckCheck className="size-3.5 text-status-resolved" />;
    case "DUPLICATE_LINKED":
      return <Copy className="size-3.5 text-yellow-500" />;
    case "MERGED":
      return <Merge className="size-3.5 text-purple-500" />;
    case "COMMENT_REMOVED":
      return <MessageSquare className="size-3.5 text-muted-foreground" />;
  }
}

function changedFieldLabel(field: string): string {
  switch (field) {
    case "title":
      return "Title";
    case "description":
      return "Description";
    case "category":
      return "Category";
    case "barangay":
      return "Barangay";
    case "severity":
      return "Severity";
    case "photo_urls":
      return "Photos";
    case "latitude":
      return "Latitude";
    case "longitude":
      return "Longitude";
    case "location_label":
      return "Location label";
    default:
      return field;
  }
}

export async function ReportTimeline({
  reportId,
  submittedAt,
  submittedById,
  status,
  reviewedAt,
  reviewedById,
  resolvedAt,
  rejectionReason,
  resolutionNotes,
}: ReportTimelineProps) {
  const adminClient = createAdminClient();

  const { data: logRows } = await adminClient
    .from("report_activity_log")
    .select("id, actor_id, action, detail, created_at")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  const fallbackEvents: TimelineEvent[] = [];
  if (!logRows || logRows.length === 0) {
    fallbackEvents.push({
      id: "fallback-submitted",
      at: submittedAt,
      actorId: submittedById,
      action: "SUBMITTED",
      detail: null,
    });
    if ((status === "APPROVED" || status === "REJECTED") && reviewedAt) {
      fallbackEvents.push({
        id: "fallback-reviewed",
        at: reviewedAt,
        actorId: reviewedById ?? null,
        action: status === "APPROVED" ? "APPROVED" : "REJECTED",
        detail: status === "REJECTED" ? { reason: rejectionReason ?? null } : null,
      });
    }
    if (status === "RESOLVED" && resolvedAt) {
      fallbackEvents.push({
        id: "fallback-resolved",
        at: resolvedAt,
        actorId: null,
        action: "RESOLVED",
        detail: { notes: resolutionNotes ?? null },
      });
    }
  }

  const events: TimelineEvent[] = (logRows ?? []).map((row) => ({
    id: row.id,
    at: row.created_at,
    actorId: row.actor_id,
    action: row.action,
    detail: row.detail as Record<string, unknown> | null,
  }));

  const combined = [...fallbackEvents, ...events].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );

  const actorIds = [
    ...new Set(combined.map((e) => e.actorId).filter((id): id is string => !!id)),
  ];
  const { data: profiles } = actorIds.length
    ? await adminClient
        .from("profiles")
        .select("id, full_name")
        .in("id", actorIds)
    : { data: null };

  const actorName = (id: string | null): string => {
    if (!id) return "System";
    return profiles?.find((p) => p.id === id)?.full_name ?? "Unknown";
  };

  if (combined.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-sm font-semibold text-foreground">History</h2>
      <ol className="space-y-4">
        {combined.map((event, index) => (
          <li key={event.id} className="relative flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                {actionIcon(event.action)}
              </span>
              {index < combined.length - 1 && (
                <span className="w-px flex-1 bg-border" aria-hidden="true" />
              )}
            </div>
            <div className="pb-1">
              <p className="text-sm font-medium text-foreground">
                {actionLabel[event.action]}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {formatReportDate(event.at)}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                by {actorName(event.actorId)}
              </p>
              {event.action === "EDITED" &&
                event.detail?.changedFields != null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Changed:{" "}
                    {Object.keys(
                      event.detail.changedFields as Record<string, unknown>,
                    )
                      .map(changedFieldLabel)
                      .join(", ")}
                  </p>
                )}
              {event.action === "REJECTED" &&
                typeof event.detail?.reason === "string" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reason: {event.detail.reason}
                  </p>
                )}
              {event.action === "RESOLVED" &&
                typeof event.detail?.notes === "string" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.detail.notes}
                  </p>
                )}
              {event.action === "DUPLICATE_LINKED" &&
                typeof event.detail?.canonicalId === "string" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Canonical report: #{event.detail.canonicalId.slice(0, 8)}
                  </p>
                )}
              {event.action === "MERGED" &&
                typeof event.detail?.canonicalId === "string" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Merged into report: #{event.detail.canonicalId.slice(0, 8)}
                  </p>
                )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
