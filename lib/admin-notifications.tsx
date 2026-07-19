import { createAdminClient } from "@/lib/supabase/service-role";
import { createNotification, getMessageForType, getSubjectForType } from "@/lib/notifications";
import { sendStatusEmail } from "@/lib/email";
import {
  renderApprovedEmail,
  renderRejectedEmail,
  renderResolvedEmail,
} from "@/emails/render";

interface SubmitterInfo {
  id: string;
  email: string;
  full_name: string;
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
    .select("id, email, full_name")
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
): Promise<void> {
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

  await sendStatusEmail({
    to: submitter.email,
    toName: submitter.full_name,
    subject,
    htmlContent,
  });
}
