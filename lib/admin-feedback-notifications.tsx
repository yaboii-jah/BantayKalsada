import { createAdminClient } from "@/lib/supabase/service-role";
import { createNotification, getMessageForType, getSubjectForType } from "@/lib/notifications";
import { sendStatusEmail } from "@/lib/email";
import {
  renderFeedbackAcknowledgedEmail,
  renderFeedbackClosedEmail,
} from "@/emails/render";

interface SubmitterInfo {
  id: string;
  email: string;
  full_name: string;
}

type FeedbackNotificationType = "FEEDBACK_ACKNOWLEDGED" | "FEEDBACK_CLOSED";

export interface FeedbackWithSubmitter {
  id: string;
  title: string;
  status: string;
  user_id: string;
  submitter?: SubmitterInfo;
}

export async function fetchFeedbackWithSubmitter(
  feedbackId: string,
): Promise<FeedbackWithSubmitter | null> {
  const adminClient = createAdminClient();

  const { data: feedback } = await adminClient
    .from("feedback")
    .select("id, title, status, user_id")
    .eq("id", feedbackId)
    .single();

  if (!feedback) return null;

  const { data: submitter } = await adminClient
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", feedback.user_id)
    .single();

  return { ...feedback, submitter: submitter ?? undefined };
}

export async function sendFeedbackNotifications(
  feedbackId: string,
  feedbackTitle: string,
  submitter: SubmitterInfo,
  type: FeedbackNotificationType,
): Promise<void> {
  const message = getMessageForType(type, feedbackTitle);
  const subject = getSubjectForType(type);

  await createNotification({
    userId: submitter.id,
    feedbackId,
    type,
    message,
  });

  let htmlContent: string;

  switch (type) {
    case "FEEDBACK_ACKNOWLEDGED":
      htmlContent = renderFeedbackAcknowledgedEmail(submitter.full_name, feedbackTitle, feedbackId);
      break;
    case "FEEDBACK_CLOSED":
      htmlContent = renderFeedbackClosedEmail(submitter.full_name, feedbackTitle, feedbackId);
      break;
  }

  await sendStatusEmail({
    to: submitter.email,
    toName: submitter.full_name,
    subject,
    htmlContent,
  });
}
