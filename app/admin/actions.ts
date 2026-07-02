"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service-role";
import {
  approveReportSchema,
  rejectReportSchema,
  resolveReportSchema,
} from "@/lib/validations/report";

export interface AdminActionResponse {
  success: boolean;
  error?: string;
}

export async function approveReport(
  reportId: string,
): Promise<AdminActionResponse> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "ADMIN") {
      return { success: false, error: "Not authorized" };
    }

    const parsed = approveReportSchema.safeParse({ reportId });
    if (!parsed.success) {
      return { success: false, error: "Invalid report ID" };
    }

    const adminClient = createAdminClient();

    const { data: report } = await adminClient
      .from("reports")
      .select("status")
      .eq("id", parsed.data.reportId)
      .single();

    if (!report) {
      return { success: false, error: "Report not found" };
    }

    if (report.status !== "PENDING") {
      return { success: false, error: "Only pending reports can be approved" };
    }

    const { error: updateError } = await adminClient
      .from("reports")
      .update({
        status: "APPROVED",
        reviewed_by_id: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.reportId);

    if (updateError) {
      return { success: false, error: "Failed to approve report" };
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
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "ADMIN") {
      return { success: false, error: "Not authorized" };
    }

    const parsed = rejectReportSchema.safeParse({ reportId, rejectionReason });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const adminClient = createAdminClient();

    const { data: report } = await adminClient
      .from("reports")
      .select("status")
      .eq("id", parsed.data.reportId)
      .single();

    if (!report) {
      return { success: false, error: "Report not found" };
    }

    if (report.status !== "PENDING") {
      return { success: false, error: "Only pending reports can be rejected" };
    }

    const { error: updateError } = await adminClient
      .from("reports")
      .update({
        status: "REJECTED",
        rejection_reason: parsed.data.rejectionReason,
        reviewed_by_id: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.reportId);

    if (updateError) {
      return { success: false, error: "Failed to reject report" };
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
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "ADMIN") {
      return { success: false, error: "Not authorized" };
    }

    const parsed = resolveReportSchema.safeParse({ reportId });
    if (!parsed.success) {
      return { success: false, error: "Invalid report ID" };
    }

    const adminClient = createAdminClient();

    const { data: report } = await adminClient
      .from("reports")
      .select("status")
      .eq("id", parsed.data.reportId)
      .single();

    if (!report) {
      return { success: false, error: "Report not found" };
    }

    if (report.status !== "APPROVED") {
      return { success: false, error: "Only approved reports can be resolved" };
    }

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

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
