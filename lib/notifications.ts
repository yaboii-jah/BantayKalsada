import { createAdminClient } from "@/lib/supabase/service-role";

export type ReportNotificationType = "REPORT_APPROVED" | "REPORT_REJECTED" | "REPORT_RESOLVED";
export type CommentNotificationType = "COMMENT_ADDED";
export type FeedbackNotificationType = "FEEDBACK_ACKNOWLEDGED" | "FEEDBACK_CLOSED" | "FEEDBACK_NOTE_ADDED";
export type FlagNotificationType = "REPORT_FLAGGED";
export type NotificationType = CommentNotificationType | ReportNotificationType | FeedbackNotificationType | FlagNotificationType;

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
    case "FEEDBACK_ACKNOWLEDGED":
      return `Your feedback "${title}" has been reviewed and acknowledged.`;
    case "FEEDBACK_CLOSED":
      return `Your feedback "${title}" has been closed.`;
    case "FEEDBACK_NOTE_ADDED":
      return `An admin has added a note to your feedback "${title}".`;
    case "REPORT_FLAGGED":
      return `Report "${title}" was flagged by a citizen for admin review.`;
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
    case "FEEDBACK_ACKNOWLEDGED":
      return "Feedback Acknowledged — Bantay Kalsada";
    case "FEEDBACK_CLOSED":
      return "Feedback Closed — Bantay Kalsada";
    case "FEEDBACK_NOTE_ADDED":
      return "Admin Note Added to Your Feedback — Bantay Kalsada";
    case "REPORT_FLAGGED":
      return "Report Flagged for Review — Bantay Kalsada";
  }
}

export interface CreateNotificationParams {
  userId: string;
  reportId?: string;
  feedbackId?: string;
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
    type: params.type,
    message: params.message,
  });

  if (error) {
    console.error("Failed to create notification:", error.message);
  }
}
