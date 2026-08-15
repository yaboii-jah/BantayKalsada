import { createAdminClient } from "@/lib/supabase/service-role";
import {
  createNotification,
  getMessageForType,
  getSubjectForType,
  getSmsMessageForType,
} from "@/lib/notifications";
import { sendStatusEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { sendPushNotification } from "@/lib/push";
import {
  renderApprovedEmail,
  renderRejectedEmail,
  renderResolvedEmail,
} from "@/emails/render";

interface SubmitterInfo {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  sms_notifications?: boolean | null;
}

type NotificationType = "REPORT_APPROVED" | "REPORT_REJECTED" | "REPORT_RESOLVED";

export interface ReportWithSubmitter {
  status: string;
  title: string;
  submitted_by_id: string;
  submitter?: SubmitterInfo;
}

export async function fetchReportWithSubmitter(reportId: string): Promise<ReportWithSubmitter | null> {
  const adminClient = createAdminClient();

  const { data: report } = await adminClient
    .from("reports")
    .select("status, title, submitted_by_id")
    .eq("id", reportId)
    .single();

  if (!report) return null;

  const { data: submitter } = await adminClient
    .from("profiles")
    .select("id, email, full_name, phone, sms_notifications")
    .eq("id", report.submitted_by_id)
    .single();

  return { ...report, submitter: submitter ?? undefined };
}

export async function sendReportNotifications(
  reportId: string,
  reportTitle: string,
  submitter: SubmitterInfo,
  type: NotificationType,
  rejectionReason?: string,
  resolutionNotes?: string,
): Promise<{ smsError?: string }> {
  const message = getMessageForType(type, reportTitle);
  const subject = getSubjectForType(type);

  await createNotification({
    userId: submitter.id,
    reportId,
    type,
    message,
  });

  let htmlContent: string;

  switch (type) {
    case "REPORT_APPROVED":
      htmlContent = renderApprovedEmail(submitter.full_name, reportTitle, reportId);
      break;
    case "REPORT_REJECTED":
      htmlContent = renderRejectedEmail(submitter.full_name, reportTitle, reportId, rejectionReason ?? "");
      break;
    case "REPORT_RESOLVED":
      htmlContent = renderResolvedEmail(submitter.full_name, reportTitle, reportId, resolutionNotes);
      break;
  }

  try {
    await sendStatusEmail({
      to: submitter.email,
      toName: submitter.full_name,
      subject,
      htmlContent,
    });
  } catch (emailErr) {
    console.error(
      `Failed to send email for report ${reportId}:`,
      emailErr instanceof Error ? emailErr.message : emailErr,
    );
  }

  if (submitter.phone && submitter.sms_notifications) {
    const smsMessage = getSmsMessageForType(
      type,
      reportTitle,
      rejectionReason,
    );
    const result = await sendSMS(submitter.phone, smsMessage);
    if (!result.success) {
      const maskedPhone = submitter.phone.replace(/.(?=.{4})/g, "*");
      const errMsg = `SMS failed for ${maskedPhone}: ${result.error}`;
      console.error(`Failed to send SMS for report ${reportId}:`, errMsg);
      return { smsError: errMsg };
    }
  }

  const pushUrl = `/my-reports/${reportId}`;
  sendPushNotification(submitter.id, subject, message, pushUrl).catch((err) =>
    console.error(`Push failed for report ${reportId}:`, err),
  );

  return {};
}
