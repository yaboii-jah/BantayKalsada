"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service-role";
import { sanitizeSearchTerm } from "@/lib/api-reports";
import type { Database } from "@/types/database.types";
import {
  approveReportSchema,
  rejectReportSchema,
  resolveReportSchema,
  createReportSchema,
  type CreateReportInput,
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
  type ReportNotificationResult,
} from "@/lib/admin-notifications";
import {
  fetchFeedbackWithSubmitter,
  sendFeedbackNotifications,
} from "@/lib/admin-feedback-notifications";
import { logReportActivity } from "@/lib/report-activity";
import { createNotification, getMessageForType } from "@/lib/notifications";

export interface AdminActionResponse {
  success: boolean;
  error?: string;
  warnings?: string[];
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

function collectSmsWarnings(result: ReportNotificationResult): string[] {
  const warnings: string[] = [];
  if (result.smsSkipped) {
    warnings.push(
      "SMS skipped — submitter has no phone number or SMS notifications disabled.",
    );
  }
  if (result.smsError) {
    warnings.push(result.smsError);
  }
  return warnings;
}

async function settleNotificationPromises(
  promises: Promise<ReportNotificationResult>[],
): Promise<string[]> {
  if (promises.length === 0) return [];
  const settled = await Promise.allSettled(promises);
  const warnings: string[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      warnings.push(...collectSmsWarnings(result.value));
    } else {
      console.error("Notification send failed:", result.reason);
    }
  }
  return warnings;
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

    await logReportActivity({
      reportId: parsed.data.reportId,
      actorId: auth.user.id,
      action: "APPROVED",
    });

    if (reportData.submitter) {
      const notifResult = await sendReportNotifications(
        parsed.data.reportId,
        reportData.title,
        reportData.submitter,
        "REPORT_APPROVED",
      );
      const warnings = collectSmsWarnings(notifResult);
      for (const warning of warnings) {
        console.error("SMS warning:", warning);
      }
      return { success: true, warnings: warnings.length ? warnings : undefined };
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

    await logReportActivity({
      reportId: parsed.data.reportId,
      actorId: auth.user.id,
      action: "REJECTED",
      detail: { reason: parsed.data.rejectionReason },
    });

    if (reportData.submitter) {
      const notifResult = await sendReportNotifications(
        parsed.data.reportId,
        reportData.title,
        reportData.submitter,
        "REPORT_REJECTED",
        parsed.data.rejectionReason,
      );
      const warnings = collectSmsWarnings(notifResult);
      for (const warning of warnings) {
        console.error("SMS warning:", warning);
      }
      return { success: true, warnings: warnings.length ? warnings : undefined };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function resolveReport(
  reportId: string,
  resolutionNotes?: string,
  resolvedImageUrls?: string[],
): Promise<AdminActionResponse> {
  try {
    const auth = await verifyAdmin();
    if (auth.error || !auth.user) {
      return { success: false, error: auth.error };
    }

    const parsed = resolveReportSchema.safeParse({
      reportId,
      resolutionNotes,
      resolvedImageUrls,
    });
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

    if (reportData.status !== "APPROVED") {
      return { success: false, error: "Only approved reports can be resolved" };
    }

    const adminClient = createAdminClient();

    const { error: updateError } = await adminClient
      .from("reports")
      .update({
        status: "RESOLVED",
        resolved_at: new Date().toISOString(),
        resolution_notes: parsed.data.resolutionNotes ?? null,
        resolved_image_urls: parsed.data.resolvedImageUrls ?? [],
      })
      .eq("id", parsed.data.reportId);

    if (updateError) {
      return { success: false, error: "Failed to resolve report" };
    }

    await logReportActivity({
      reportId: parsed.data.reportId,
      actorId: auth.user.id,
      action: "RESOLVED",
      detail: { notes: parsed.data.resolutionNotes ?? null },
    });

    if (reportData.submitter) {
      const notifResult = await sendReportNotifications(
        parsed.data.reportId,
        reportData.title,
        reportData.submitter,
        "REPORT_RESOLVED",
        undefined,
        parsed.data.resolutionNotes,
      );
      const warnings = collectSmsWarnings(notifResult);
      for (const warning of warnings) {
        console.error("SMS warning:", warning);
      }
      return { success: true, warnings: warnings.length ? warnings : undefined };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function editReport(
  reportId: string,
  formData: CreateReportInput,
): Promise<AdminActionResponse> {
  try {
    const auth = await verifyAdmin();
    if (auth.error || !auth.user) {
      return { success: false, error: auth.error };
    }

    if (!z.string().uuid().safeParse(reportId).success) {
      return { success: false, error: "Invalid report id" };
    }

    const adminClient = createAdminClient();

    const { data: existing, error: fetchError } = await adminClient
      .from("reports")
      .select(
        "status, submitted_by_id, title, description, category, barangay, severity, photo_urls, latitude, longitude, location_label",
      )
      .eq("id", reportId)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: "Report not found" };
    }

    const parsed = createReportSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const latChanged = existing.latitude !== parsed.data.latitude;
    const lngChanged = existing.longitude !== parsed.data.longitude;
    if (latChanged || lngChanged) {
      const { data: withinBoundary } = await adminClient.rpc(
        "is_within_boundary",
        {
          lat: parsed.data.latitude,
          lng: parsed.data.longitude,
          municipality_name: "Taytay",
        },
      );
      if (!withinBoundary) {
        return {
          success: false,
          error:
            "Reports are accepted for Taytay, Rizal only. Please pin a location within Taytay.",
        };
      }
    }

    const { error: updateError } = await adminClient
      .from("reports")
      .update({
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        barangay: parsed.data.barangay,
        severity: parsed.data.severity,
        photo_urls: parsed.data.photo_urls,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        location_label: parsed.data.location_label ?? null,
      })
      .eq("id", reportId);

    if (updateError) {
      return { success: false, error: "Failed to update report" };
    }

    const changedFields: Record<string, unknown> = {};
    const fields: (keyof CreateReportInput)[] = [
      "title",
      "description",
      "category",
      "barangay",
      "severity",
      "photo_urls",
      "latitude",
      "longitude",
      "location_label",
    ];
    for (const field of fields) {
      const before = existing[field];
      const after = parsed.data[field] ?? null;
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        changedFields[field] = { before, after };
      }
    }

    await logReportActivity({
      reportId,
      actorId: auth.user.id,
      action: "EDITED",
      detail: { changedFields },
    });

    if (existing.submitted_by_id) {
      await createNotification({
        userId: existing.submitted_by_id,
        reportId,
        type: "REPORT_EDITED",
        message: getMessageForType("REPORT_EDITED", parsed.data.title),
      });
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export interface DuplicateCandidate {
  id: string;
  title: string;
  status: Database["public"]["Enums"]["report_status"];
  submitted_at: string;
  distance_m?: number | null;
}

export async function findDuplicateCandidates(
  reportId: string,
  query?: string,
): Promise<{ success: boolean; candidates?: DuplicateCandidate[]; error?: string }> {
  try {
    const auth = await verifyAdmin();
    if (auth.error || !auth.user) {
      return { success: false, error: auth.error };
    }

    if (!z.string().uuid().safeParse(reportId).success) {
      return { success: false, error: "Invalid report id" };
    }

    const adminClient = createAdminClient();

    const { data: report } = await adminClient
      .from("reports")
      .select("id, latitude, longitude, duplicate_of_id")
      .eq("id", reportId)
      .single();

    if (!report) {
      return { success: false, error: "Report not found" };
    }

    const { data: nearby } = await adminClient.rpc("get_nearby_reports", {
      lat: report.latitude,
      lng: report.longitude,
      max_distance_m: 1500,
    });

    const nearbyMap = new Map<string, number>();
    for (const row of nearby ?? []) {
      if (row.id !== reportId) {
        nearbyMap.set(row.id, row.distance_m);
      }
    }

    const titleQuery = query ? sanitizeSearchTerm(query) : "";
    let titleMatches: { id: string }[] = [];
    if (titleQuery.length >= 3) {
      const { data } = await adminClient
        .from("reports")
        .select("id")
        .ilike("title", `%${titleQuery}%`);
      titleMatches = data ?? [];
    }

    const candidateIds = [
      ...new Set([...nearbyMap.keys(), ...titleMatches.map((m) => m.id)]),
    ];

    if (candidateIds.length === 0) {
      return { success: true, candidates: [] };
    }

    const { data: candidates } = await adminClient
      .from("reports")
      .select("id, title, status, submitted_at, duplicate_of_id")
      .in("id", candidateIds);

    const result: DuplicateCandidate[] = (candidates ?? [])
      .filter((c) => c.id !== reportId && !c.duplicate_of_id)
      .map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        submitted_at: c.submitted_at,
        distance_m: nearbyMap.get(c.id) ?? null,
      }))
      .sort((a, b) => {
        if (a.distance_m != null && b.distance_m != null) {
          return a.distance_m - b.distance_m;
        }
        return a.distance_m != null ? -1 : b.distance_m != null ? 1 : 0;
      });

    return { success: true, candidates: result };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function linkDuplicate(
  duplicateId: string,
  canonicalId: string,
): Promise<AdminActionResponse> {
  try {
    const auth = await verifyAdmin();
    if (auth.error || !auth.user) {
      return { success: false, error: auth.error };
    }

    if (
      !z.string().uuid().safeParse(duplicateId).success ||
      !z.string().uuid().safeParse(canonicalId).success
    ) {
      return { success: false, error: "Invalid report id" };
    }

    if (duplicateId === canonicalId) {
      return { success: false, error: "A report cannot be its own duplicate" };
    }

    const adminClient = createAdminClient();

    const { data: canonical } = await adminClient
      .from("reports")
      .select("id, duplicate_of_id")
      .eq("id", canonicalId)
      .single();

    if (!canonical) {
      return { success: false, error: "Canonical report not found" };
    }

    if (canonical.duplicate_of_id) {
      return {
        success: false,
        error: "The target report is itself a duplicate and cannot be the canonical report",
      };
    }

    const { error: updateError } = await adminClient
      .from("reports")
      .update({ duplicate_of_id: canonicalId })
      .eq("id", duplicateId);

    if (updateError) {
      return { success: false, error: "Failed to link duplicate" };
    }

    await logReportActivity({
      reportId: duplicateId,
      actorId: auth.user.id,
      action: "DUPLICATE_LINKED",
      detail: { canonicalId },
    });

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function unlinkDuplicate(
  duplicateId: string,
): Promise<AdminActionResponse> {
  try {
    const auth = await verifyAdmin();
    if (auth.error || !auth.user) {
      return { success: false, error: auth.error };
    }

    if (!z.string().uuid().safeParse(duplicateId).success) {
      return { success: false, error: "Invalid report id" };
    }

    const adminClient = createAdminClient();

    const { data: existing } = await adminClient
      .from("reports")
      .select("duplicate_of_id")
      .eq("id", duplicateId)
      .single();

    if (!existing?.duplicate_of_id) {
      return { success: false, error: "Report is not linked as a duplicate" };
    }

    const { error: updateError } = await adminClient
      .from("reports")
      .update({ duplicate_of_id: null })
      .eq("id", duplicateId);

    if (updateError) {
      return { success: false, error: "Failed to unlink duplicate" };
    }

    await logReportActivity({
      reportId: duplicateId,
      actorId: auth.user.id,
      action: "DUPLICATE_LINKED",
      detail: { canonicalId: null, unlinked: true },
    });

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function mergeReports(
  duplicateId: string,
  canonicalId: string,
): Promise<AdminActionResponse> {
  try {
    const auth = await verifyAdmin();
    if (auth.error || !auth.user) {
      return { success: false, error: auth.error };
    }

    if (
      !z.string().uuid().safeParse(duplicateId).success ||
      !z.string().uuid().safeParse(canonicalId).success
    ) {
      return { success: false, error: "Invalid report id" };
    }

    if (duplicateId === canonicalId) {
      return { success: false, error: "A report cannot be merged into itself" };
    }

    const adminClient = createAdminClient();

    const { data: canonical } = await adminClient
      .from("reports")
      .select("id, title, duplicate_of_id, photo_urls")
      .eq("id", canonicalId)
      .single();

    if (!canonical) {
      return { success: false, error: "Canonical report not found" };
    }

    if (canonical.duplicate_of_id) {
      return {
        success: false,
        error: "The target report is itself a duplicate and cannot be the canonical report",
      };
    }

    const { data: duplicate } = await adminClient
      .from("reports")
      .select("id, photo_urls")
      .eq("id", duplicateId)
      .single();

    if (!duplicate) {
      return { success: false, error: "Duplicate report not found" };
    }

    const { error: commentsError } = await adminClient
      .from("report_comments")
      .update({ report_id: canonicalId })
      .eq("report_id", duplicateId);

    if (commentsError) {
      return { success: false, error: "Failed to move comments" };
    }

    const { error: flagsError } = await adminClient
      .from("report_flags")
      .update({ report_id: canonicalId })
      .eq("report_id", duplicateId);

    if (flagsError) {
      return { success: false, error: "Failed to move flags" };
    }

    const mergedPhotos = [
      ...new Set([...canonical.photo_urls, ...duplicate.photo_urls]),
    ].slice(0, 3);

    const { error: photoError } = await adminClient
      .from("reports")
      .update({ photo_urls: mergedPhotos })
      .eq("id", canonicalId);

    if (photoError) {
      return { success: false, error: "Failed to merge photos" };
    }

    const { error: retireError } = await adminClient
      .from("reports")
      .update({ duplicate_of_id: canonicalId })
      .eq("id", duplicateId);

    if (retireError) {
      return { success: false, error: "Failed to retire duplicate report" };
    }

    await logReportActivity({
      reportId: duplicateId,
      actorId: auth.user.id,
      action: "MERGED",
      detail: { canonicalId },
    });
    await logReportActivity({
      reportId: canonicalId,
      actorId: auth.user.id,
      action: "MERGED",
      detail: { duplicateId },
    });

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
    const notifPromises: Promise<ReportNotificationResult>[] = [];

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

      await logReportActivity({
        reportId: id,
        actorId: auth.user.id,
        action: "APPROVED",
      });

      if (reportData.submitter) {
        notifPromises.push(
          sendReportNotifications(
            id,
            reportData.title,
            reportData.submitter,
            "REPORT_APPROVED",
          ),
        );
      }
    }

    if (approved === 0) {
      return { success: false, error: errors.join("; ") || "No reports were approved" };
    }

    const warnings = await settleNotificationPromises(notifPromises);

    return { success: true, warnings: warnings.length ? warnings : undefined };
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
    const notifPromises: Promise<ReportNotificationResult>[] = [];

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

      await logReportActivity({
        reportId: id,
        actorId: auth.user.id,
        action: "REJECTED",
        detail: { reason: parsed.data.rejectionReason },
      });

      if (reportData.submitter) {
        notifPromises.push(
          sendReportNotifications(
            id,
            reportData.title,
            reportData.submitter,
            "REPORT_REJECTED",
            parsed.data.rejectionReason,
          ),
        );
      }
    }

    if (rejected === 0) {
      return { success: false, error: errors.join("; ") || "No reports were rejected" };
    }

    const warnings = await settleNotificationPromises(notifPromises);

    return { success: true, warnings: warnings.length ? warnings : undefined };
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
    const notifPromises: Promise<ReportNotificationResult>[] = [];

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

      await logReportActivity({
        reportId: id,
        actorId: auth.user.id,
        action: "RESOLVED",
      });

      if (reportData.submitter) {
        notifPromises.push(
          sendReportNotifications(
            id,
            reportData.title,
            reportData.submitter,
            "REPORT_RESOLVED",
          ),
        );
      }
    }

    if (resolved === 0) {
      return { success: false, error: errors.join("; ") || "No reports were resolved" };
    }

    const warnings = await settleNotificationPromises(notifPromises);

    return { success: true, warnings: warnings.length ? warnings : undefined };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function removeComment(
  commentId: string,
): Promise<AdminActionResponse> {
  try {
    const auth = await verifyAdmin();
    if (auth.error || !auth.user) {
      return { success: false, error: auth.error };
    }

    if (!z.string().uuid().safeParse(commentId).success) {
      return { success: false, error: "Invalid comment id" };
    }

    const adminClient = createAdminClient();

    const { data: comment } = await adminClient
      .from("report_comments")
      .select("report_id")
      .eq("id", commentId)
      .single();

    if (!comment) {
      return { success: false, error: "Comment not found" };
    }

    const { error } = await adminClient
      .from("report_comments")
      .update({ status: "REMOVED", updated_at: new Date().toISOString() })
      .eq("id", commentId);

    if (error) {
      return { success: false, error: "Failed to remove comment" };
    }

    if (comment.report_id) {
      await logReportActivity({
        reportId: comment.report_id,
        actorId: auth.user.id,
        action: "COMMENT_REMOVED",
        detail: { commentId },
      });
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
