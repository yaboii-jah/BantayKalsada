import { createAdminClient } from "@/lib/supabase/service-role";

export type NotificationType = "REPORT_APPROVED" | "REPORT_REJECTED" | "REPORT_RESOLVED";

export function getMessageForType(type: NotificationType, reportTitle: string): string {
  switch (type) {
    case "REPORT_APPROVED":
      return `Your report "${reportTitle}" has been approved and is now visible on the public feed.`;
    case "REPORT_REJECTED":
      return `Your report "${reportTitle}" has been rejected.`;
    case "REPORT_RESOLVED":
      return `Your report "${reportTitle}" has been marked as resolved.`;
  }
}

export function getSubjectForType(type: NotificationType): string {
  switch (type) {
    case "REPORT_APPROVED":
      return "Report Approved — Bantay Kalsada";
    case "REPORT_REJECTED":
      return "Report Rejected — Bantay Kalsada";
    case "REPORT_RESOLVED":
      return "Report Resolved — Bantay Kalsada";
  }
}

export interface CreateNotificationParams {
  userId: string;
  reportId: string;
  type: NotificationType;
  message: string;
}

export async function createNotification(
  params: CreateNotificationParams,
): Promise<void> {
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("notifications").insert({
    user_id: params.userId,
    report_id: params.reportId,
    type: params.type,
    message: params.message,
  });

  if (error) {
    console.error("Failed to create notification:", error.message);
  }
}
