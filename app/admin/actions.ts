"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service-role";
import {
  approveReportSchema,
  rejectReportSchema,
  resolveReportSchema,
} from "@/lib/validations/report";
import {
  bulkActionSchema,
  bulkRejectSchema,
} from "@/lib/validations/bulk";
import {
  acknowledgeFeedbackSchema,
  closeFeedbackSchema,
  updateFeedbackNoteSchema,
} from "@/lib/validations/feedback";
import {
  fetchReportWithSubmitter,
  sendReportNotifications,
} from "@/lib/admin-notifications";
import {
  fetchFeedbackWithSubmitter,
  sendFeedbackNotifications,
} from "@/lib/admin-feedback-notifications";

export interface AdminActionResponse {
  success: boolean;
  error?: string;
}

interface AdminAuth {
  user: import("@supabase/supabase-js").User;
  error: null;
}

interface AdminAuthError {
  user: null;
  error: string;
}

type AdminAuthResult = AdminAuth | AdminAuthError;

async function verifyAdmin(): Promise<AdminAuthResult> {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { user: null, error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "ADMIN") {
    return { user: null, error: "Not authorized" };
  }

  return { user, error: null };
}

export async function approveReport(
  reportId: string,
): Promise<AdminActionResponse> {
  try {
    const auth = await verifyAdmin();
    if (auth.error || !auth.user) {
      return { success: false, error: auth.error };
    }

    const parsed = approveReportSchema.safeParse({ reportId });
    if (!parsed.success) {
      return { success: false, error: "Invalid report ID" };
    }

    const reportData = await fetchReportWithSubmitter(parsed.data.reportId);
    if (!reportData) {
      return { success: false, error: "Report not found" };
    }

    if (reportData.status !== "PENDING") {
      return { success: false, error: "Only pending reports can be approved" };
    }

    const adminClient = createAdminClient();

    const { error: updateError } = await adminClient
      .from("reports")
      .update({
        status: "APPROVED",
        reviewed_by_id: auth.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.reportId);

    if (updateError) {
      return { success: false, error: "Failed to approve report" };
    }

    if (reportData.submitter) {
      sendReportNotifications(
        parsed.data.reportId,
        reportData.title,
        reportData.submitter,
        "REPORT_APPROVED",
      ).catch((err) => console.error("Failed to send approval notification:", err));
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function rejectReport(
  reportId: string,
  rejectionReason: string,
): Promise<AdminActionResponse> {
  try {
    const auth = await verifyAdmin();
    if (auth.error || !auth.user) {
      return { success: false, error: auth.error };
    }

    const parsed = rejectReportSchema.safeParse({ reportId, rejectionReason });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const reportData = await fetchReportWithSubmitter(parsed.data.reportId);
    if (!reportData) {
      return { success: false, error: "Report not found" };
    }

    if (reportData.status !== "PENDING") {
      return { success: false, error: "Only pending reports can be rejected" };
    }

    const adminClient = createAdminClient();

    const { error: updateError } = await adminClient
      .from("reports")
      .update({
        status: "REJECTED",
        rejection_reason: parsed.data.rejectionReason,
        reviewed_by_id: auth.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.reportId);

    if (updateError) {
      return { success: false, error: "Failed to reject report" };
    }

    if (reportData.submitter) {
      sendReportNotifications(
        parsed.data.reportId,
        reportData.title,
        reportData.submitter,
        "REPORT_REJECTED",
        parsed.data.rejectionReason,
      ).catch((err) => console.error("Failed to send rejection notification:", err));
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function resolveReport(
  reportId: string,
): Promise<AdminActionResponse> {
  try {
    const auth = await verifyAdmin();
    if (auth.error || !auth.user) {
      return { success: false, error: auth.error };
    }

    const parsed = resolveReportSchema.safeParse({ reportId });
    if (!parsed.success) {
      return { success: false, error: "Invalid report ID" };
    }

    const reportData = await fetchReportWithSubmitter(parsed.data.reportId);
    if (!reportData) {
      return { success: false, error: "Report not found" };
    }

    if (reportData.status !== "APPROVED") {
      return { success: false, error: "Only approved reports can be resolved" };
    }

    const adminClient = createAdminClient();

    const { error: updateError } = await adminClient
      .from("reports")
      .update({
        status: "RESOLVED",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.reportId);

    if (updateError) {
      return { success: false, error: "Failed to resolve report" };
    }

    if (reportData.submitter) {
      sendReportNotifications(
        parsed.data.reportId,
        reportData.title,
        reportData.submitter,
        "REPORT_RESOLVED",
      ).catch((err) => console.error("Failed to send resolution notification:", err));
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function acknowledgeFeedback(
  feedbackId: string,
): Promise<AdminActionResponse> {
  try {
    const auth = await verifyAdmin();
    if (auth.error || !auth.user) {
      return { success: false, error: auth.error };
    }

    const parsed = acknowledgeFeedbackSchema.safeParse({ feedbackId });
    if (!parsed.success) {
      return { success: false, error: "Invalid feedback ID" };
    }

    const feedbackData = await fetchFeedbackWithSubmitter(parsed.data.feedbackId);
    if (!feedbackData) {
      return { success: false, error: "Feedback not found" };
    }

    if (feedbackData.status !== "OPEN") {
      return { success: false, error: "Only open feedback can be acknowledged" };
    }

    const adminClient = createAdminClient();

    const { error: updateError } = await adminClient
      .from("feedback")
      .update({
        status: "ACKNOWLEDGED",
      })
      .eq("id", parsed.data.feedbackId);

    if (updateError) {
      return { success: false, error: "Failed to acknowledge feedback" };
    }

    if (feedbackData.submitter) {
      sendFeedbackNotifications(
        parsed.data.feedbackId,
        feedbackData.title,
        feedbackData.submitter,
        "FEEDBACK_ACKNOWLEDGED",
      ).catch((err) => console.error("Failed to send feedback acknowledgment:", err));
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateFeedbackNote(
  feedbackId: string,
  adminNote: string | null,
): Promise<AdminActionResponse> {
  try {
    const auth = await verifyAdmin();
    if (auth.error || !auth.user) {
      return { success: false, error: auth.error };
    }

    const parsed = updateFeedbackNoteSchema.safeParse({ feedbackId, adminNote });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const feedbackData = await fetchFeedbackWithSubmitter(parsed.data.feedbackId);
    if (!feedbackData) {
      return { success: false, error: "Feedback not found" };
    }

    const adminClient = createAdminClient();

    const { data: current } = await adminClient
      .from("feedback")
      .select("admin_note")
      .eq("id", parsed.data.feedbackId)
      .single();

    const wasNull = current?.admin_note == null && parsed.data.adminNote !== null;

    const { error: updateError } = await adminClient
      .from("feedback")
      .update({ admin_note: parsed.data.adminNote })
      .eq("id", parsed.data.feedbackId);

    if (updateError) {
      return { success: false, error: "Failed to update admin note" };
    }

    if (wasNull && feedbackData.submitter) {
      sendFeedbackNotifications(
        parsed.data.feedbackId,
        feedbackData.title,
        feedbackData.submitter,
        "FEEDBACK_NOTE_ADDED",
        parsed.data.adminNote ?? undefined,
      ).catch((err) => console.error("Failed to send note notification:", err));
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function closeFeedback(
  feedbackId: string,
): Promise<AdminActionResponse> {
  try {
    const auth = await verifyAdmin();
    if (auth.error || !auth.user) {
      return { success: false, error: auth.error };
    }

    const parsed = closeFeedbackSchema.safeParse({ feedbackId });
    if (!parsed.success) {
      return { success: false, error: "Invalid feedback ID" };
    }

    const feedbackData = await fetchFeedbackWithSubmitter(parsed.data.feedbackId);
    if (!feedbackData) {
      return { success: false, error: "Feedback not found" };
    }

    if (feedbackData.status === "CLOSED") {
      return { success: false, error: "Feedback is already closed" };
    }

    const adminClient = createAdminClient();

    const { error: updateError } = await adminClient
      .from("feedback")
      .update({
        status: "CLOSED",
      })
      .eq("id", parsed.data.feedbackId);

    if (updateError) {
      return { success: false, error: "Failed to close feedback" };
    }

    if (feedbackData.submitter) {
      sendFeedbackNotifications(
        parsed.data.feedbackId,
        feedbackData.title,
        feedbackData.submitter,
        "FEEDBACK_CLOSED",
      ).catch((err) => console.error("Failed to send feedback closed notification:", err));
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function bulkApproveReports(
  reportIds: string[],
): Promise<AdminActionResponse> {
  try {
    const auth = await verifyAdmin();
    if (auth.error || !auth.user) {
      return { success: false, error: auth.error };
    }

    const parsed = bulkActionSchema.safeParse({ reportIds });
    if (!parsed.success) {
      return { success: false, error: "Invalid request" };
    }

    const adminClient = createAdminClient();
    let approved = 0;
    const errors: string[] = [];

    for (const id of parsed.data.reportIds) {
      const reportData = await fetchReportWithSubmitter(id);
      if (!reportData) {
        errors.push(`Report ${id.slice(0, 8)} not found`);
        continue;
      }
      if (reportData.status !== "PENDING") {
        errors.push(`${reportData.title} is not pending`);
        continue;
      }

      const { error: updateError } = await adminClient
        .from("reports")
        .update({
          status: "APPROVED",
          reviewed_by_id: auth.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        errors.push(`Failed to approve ${reportData.title}`);
        continue;
      }

      approved++;

      if (reportData.submitter) {
        sendReportNotifications(
          id,
          reportData.title,
          reportData.submitter,
          "REPORT_APPROVED",
        ).catch(() => {});
      }
    }

    if (approved === 0) {
      return { success: false, error: errors.join("; ") || "No reports were approved" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function bulkRejectReports(
  reportIds: string[],
  rejectionReason: string,
): Promise<AdminActionResponse> {
  try {
    const auth = await verifyAdmin();
    if (auth.error || !auth.user) {
      return { success: false, error: auth.error };
    }

    const parsed = bulkRejectSchema.safeParse({ reportIds, rejectionReason });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const adminClient = createAdminClient();
    let rejected = 0;
    const errors: string[] = [];

    for (const id of parsed.data.reportIds) {
      const reportData = await fetchReportWithSubmitter(id);
      if (!reportData) {
        errors.push(`Report ${id.slice(0, 8)} not found`);
        continue;
      }
      if (reportData.status !== "PENDING") {
        errors.push(`${reportData.title} is not pending`);
        continue;
      }

      const { error: updateError } = await adminClient
        .from("reports")
        .update({
          status: "REJECTED",
          rejection_reason: parsed.data.rejectionReason,
          reviewed_by_id: auth.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        errors.push(`Failed to reject ${reportData.title}`);
        continue;
      }

      rejected++;

      if (reportData.submitter) {
        sendReportNotifications(
          id,
          reportData.title,
          reportData.submitter,
          "REPORT_REJECTED",
          parsed.data.rejectionReason,
        ).catch(() => {});
      }
    }

    if (rejected === 0) {
      return { success: false, error: errors.join("; ") || "No reports were rejected" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function bulkResolveReports(
  reportIds: string[],
): Promise<AdminActionResponse> {
  try {
    const auth = await verifyAdmin();
    if (auth.error || !auth.user) {
      return { success: false, error: auth.error };
    }

    const parsed = bulkActionSchema.safeParse({ reportIds });
    if (!parsed.success) {
      return { success: false, error: "Invalid request" };
    }

    const adminClient = createAdminClient();
    let resolved = 0;
    const errors: string[] = [];

    for (const id of parsed.data.reportIds) {
      const reportData = await fetchReportWithSubmitter(id);
      if (!reportData) {
        errors.push(`Report ${id.slice(0, 8)} not found`);
        continue;
      }
      if (reportData.status !== "APPROVED") {
        errors.push(`${reportData.title} is not approved`);
        continue;
      }

      const { error: updateError } = await adminClient
        .from("reports")
        .update({
          status: "RESOLVED",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        errors.push(`Failed to resolve ${reportData.title}`);
        continue;
      }

      resolved++;

      if (reportData.submitter) {
        sendReportNotifications(
          id,
          reportData.title,
          reportData.submitter,
          "REPORT_RESOLVED",
        ).catch(() => {});
      }
    }

    if (resolved === 0) {
      return { success: false, error: errors.join("; ") || "No reports were resolved" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function removeComment(
  commentId: string,
): Promise<AdminActionResponse> {
  try {
    const auth = await verifyAdmin();
    if (auth.error) {
      return { success: false, error: auth.error };
    }

    const { error } = await createAdminClient()
      .from("report_comments")
      .update({ status: "REMOVED", updated_at: new Date().toISOString() })
      .eq("id", commentId);

    if (error) {
      return { success: false, error: "Failed to remove comment" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
