import { createAdminClient } from "@/lib/supabase/service-role";

export type ReportNotificationType = "REPORT_APPROVED" | "REPORT_REJECTED" | "REPORT_RESOLVED";
export type CommentNotificationType = "COMMENT_ADDED";
export type FeedbackNotificationType = "FEEDBACK_ACKNOWLEDGED" | "FEEDBACK_CLOSED" | "FEEDBACK_NOTE_ADDED";
export type FlagNotificationType = "REPORT_FLAGGED";
export type OfflineNotificationType = "OFFLINE_SUBMIT_FAILED";
export type EditedNotificationType = "REPORT_EDITED";
export type NotificationType = CommentNotificationType | ReportNotificationType | FeedbackNotificationType | FlagNotificationType | OfflineNotificationType | EditedNotificationType;

export function getMessageForType(type: NotificationType, title: string): string {
  switch (type) {
    case "COMMENT_ADDED":
      return `Someone commented on the report "${title}".`;
    case "REPORT_APPROVED":
      return `Your report "${title}" has been approved and is now visible on the public feed.`;
    case "REPORT_REJECTED":
      return `Your report "${title}" has been rejected.`;
    case "REPORT_RESOLVED":
      return `Your report "${title}" has been marked as resolved.`;
    case "REPORT_EDITED":
      return `An administrator updated the details of your report "${title}".`;
    case "FEEDBACK_ACKNOWLEDGED":
      return `Your feedback "${title}" has been reviewed and acknowledged.`;
    case "FEEDBACK_CLOSED":
      return `Your feedback "${title}" has been closed.`;
    case "FEEDBACK_NOTE_ADDED":
      return `An admin has added a note to your feedback "${title}".`;
    case "REPORT_FLAGGED":
      return `Report "${title}" was flagged by a citizen for admin review.`;
    case "OFFLINE_SUBMIT_FAILED":
      return `Couldn't submit your saved offline report "${title}" after several attempts. Open it in My Reports to retry.`;
  }
}

export function getSmsMessageForType(
  type: ReportNotificationType,
  title: string,
  rejectionReason?: string,
): string {
  const truncated =
    title.length > 40 ? `${title.slice(0, 37)}...` : title;

  switch (type) {
    case "REPORT_APPROVED":
      return `Bantay Kalsada: Your report "${truncated}" was approved and is now on the public feed.`;
    case "REPORT_REJECTED":
      return `Bantay Kalsada: Your report "${truncated}" was rejected${
        rejectionReason ? `. Reason: ${rejectionReason}` : ""
      }.`;
    case "REPORT_RESOLVED":
      return `Bantay Kalsada: Your report "${truncated}" was marked resolved. Thank you!`;
  }
}

export function getSubjectForType(type: NotificationType): string {
  switch (type) {
    case "COMMENT_ADDED":
      return "New Comment on Report — Bantay Kalsada";
    case "REPORT_APPROVED":
      return "Report Approved — Bantay Kalsada";
    case "REPORT_REJECTED":
      return "Report Rejected — Bantay Kalsada";
    case "REPORT_RESOLVED":
      return "Report Resolved — Bantay Kalsada";
    case "REPORT_EDITED":
      return "Report Updated by Admin — Bantay Kalsada";
    case "FEEDBACK_ACKNOWLEDGED":
      return "Feedback Acknowledged — Bantay Kalsada";
    case "FEEDBACK_CLOSED":
      return "Feedback Closed — Bantay Kalsada";
    case "FEEDBACK_NOTE_ADDED":
      return "Admin Note Added to Your Feedback — Bantay Kalsada";
    case "REPORT_FLAGGED":
      return "Report Flagged for Review — Bantay Kalsada";
    case "OFFLINE_SUBMIT_FAILED":
      return "Offline Report Not Submitted — Bantay Kalsada";
  }
}

export interface CreateNotificationParams {
  userId: string;
  reportId?: string;
  feedbackId?: string;
  offlineQueueId?: string;
  type: NotificationType;
  message: string;
}

export async function createNotification(
  params: CreateNotificationParams,
): Promise<void> {
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("notifications").insert({
    user_id: params.userId,
    report_id: params.reportId ?? null,
    feedback_id: params.feedbackId ?? null,
    offline_queue_id: params.offlineQueueId ?? null,
    type: params.type,
    message: params.message,
  });

  if (error) {
    console.error("Failed to create notification:", error.message);
  }
}
