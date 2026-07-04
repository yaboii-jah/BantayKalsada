"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service-role";
import {
  approveReportSchema,
  rejectReportSchema,
  resolveReportSchema,
} from "@/lib/validations/report";
import {
  fetchReportWithSubmitter,
  sendReportNotifications,
} from "@/lib/admin-notifications";

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
