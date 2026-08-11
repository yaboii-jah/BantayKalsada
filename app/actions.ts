"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service-role";
import { createReportSchema, flagReportSchema, type CreateReportInput } from "@/lib/validations/report";
import { createFeedbackSchema, type CreateFeedbackInput } from "@/lib/validations/feedback";
import {
  updateProfileSettingsSchema,
  type UpdateProfileSettingsInput,
} from "@/lib/validations/profile";
import { normalizePhoneNumber, sendSMS } from "@/lib/sms";
import { sendPushNotification } from "@/lib/push";
import { createNotification, getMessageForType } from "@/lib/notifications";
import { logReportActivity } from "@/lib/report-activity";

export interface ActionResponse {
  success: boolean;
  data?: { id: string };
  error?: string;
  retryAfter?: string;
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "Failed to mark notification as read" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function markAllNotificationsAsRead(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      return { success: false, error: "Failed to mark notifications as read" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteNotification(
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "Failed to delete notification" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function clearAllNotifications(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "Failed to clear notifications" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function createOfflineSubmitFailedNotification(
  offlineQueueId: string,
  title: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    await createNotification({
      userId: user.id,
      offlineQueueId,
      type: "OFFLINE_SUBMIT_FAILED",
      message: getMessageForType("OFFLINE_SUBMIT_FAILED", title),
    });

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteOfflineSubmitNotification(
  offlineQueueId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("offline_queue_id", offlineQueueId);

    if (error) {
      return { success: false, error: "Failed to delete notification" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function submitReport(
  _prevState: ActionResponse | null,
  formData: CreateReportInput,
): Promise<ActionResponse> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be signed in to submit a report" };
    }

    if (!user.email_confirmed_at) {
      return { success: false, error: "Please verify your email before submitting a report" };
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("submitted_by_id", user.id)
      .gte("submitted_at", twentyFourHoursAgo);

    if (countError) {
      return { success: false, error: "Failed to verify submission limit" };
    }

    if (count !== null && count >= 5) {
      const { data: oldestInWindow } = await supabase
        .from("reports")
        .select("submitted_at")
        .eq("submitted_by_id", user.id)
        .gte("submitted_at", twentyFourHoursAgo)
        .order("submitted_at", { ascending: true })
        .limit(1)
        .single();
      const retryAfter = oldestInWindow?.submitted_at
        ? new Date(
            new Date(oldestInWindow.submitted_at).getTime() +
              24 * 60 * 60 * 1000,
          ).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      return {
        success: false,
        error: "You have reached the maximum of 5 reports in 24 hours. Please try again later.",
        retryAfter,
      };
    }

    const { data: withinBoundary } = await supabase.rpc("is_within_boundary", {
      lat: formData.latitude,
      lng: formData.longitude,
      municipality_name: "Taytay",
    });
    if (!withinBoundary) {
      return {
        success: false,
        error: "Reports are accepted for Taytay, Rizal only. Please pin a location within Taytay.",
      };
    }

    const parsed = createReportSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { data: report, error: insertError } = await supabase
      .from("reports")
      .insert({
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        barangay: parsed.data.barangay,
        severity: parsed.data.severity,
        photo_urls: parsed.data.photo_urls,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        location_label: parsed.data.location_label ?? null,
        submitted_by_id: user.id,
        status: "PENDING",
      })
      .select("id")
      .single();

    if (insertError) {
      return { success: false, error: "Failed to submit report. Please try again." };
    }

    await logReportActivity({
      reportId: report.id,
      actorId: user.id,
      action: "SUBMITTED",
    });

    return { success: true, data: { id: report.id } };
  } catch {
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

export async function updateReport(
  reportId: string,
  formData: CreateReportInput,
): Promise<ActionResponse> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be signed in to update a report" };
    }

    const { data: existing, error: fetchError } = await supabase
      .from("reports")
      .select("status, submitted_by_id, latitude, longitude, title, description, category, barangay, severity, photo_urls, location_label")
      .eq("id", reportId)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: "Report not found" };
    }

    if (existing.submitted_by_id !== user.id) {
      return { success: false, error: "You can only edit your own reports" };
    }

    if (existing.status !== "PENDING") {
      return { success: false, error: "Only pending reports can be edited" };
    }

    const latChanged = existing.latitude !== formData.latitude;
    const lngChanged = existing.longitude !== formData.longitude;
    if (latChanged || lngChanged) {
      const { data: withinBoundary } = await supabase.rpc("is_within_boundary", {
        lat: formData.latitude,
        lng: formData.longitude,
        municipality_name: "Taytay",
      });
      if (!withinBoundary) {
        return {
          success: false,
          error: "Reports are accepted for Taytay, Rizal only. Please pin a location within Taytay.",
        };
      }
    }

    const parsed = createReportSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { error: updateError } = await supabase
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
      return { success: false, error: "Failed to update report. Please try again." };
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
      actorId: user.id,
      action: "EDITED",
      detail: { changedFields },
    });

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

export async function submitFeedback(
  formData: CreateFeedbackInput,
): Promise<ActionResponse> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be signed in to submit feedback" };
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("feedback")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", twentyFourHoursAgo);

    if (countError) {
      return { success: false, error: "Failed to verify submission limit" };
    }

    if (count !== null && count >= 3) {
      return {
        success: false,
        error: "You have reached the maximum of 3 feedback submissions in 24 hours. Please try again tomorrow.",
      };
    }

    const parsed = createFeedbackSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { data: feedback, error: insertError } = await supabase
      .from("feedback")
      .insert({
        type: parsed.data.type,
        title: parsed.data.title,
        description: parsed.data.description,
        rating: parsed.data.rating ?? null,
        photo_urls: parsed.data.photo_urls,
        user_id: user.id,
        status: "OPEN",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("submitFeedback insert error:", insertError);
      return { success: false, error: "Failed to submit feedback. Please try again." };
    }

    return { success: true, data: { id: feedback.id } };
  } catch {
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

export async function addComment(
  _prevState: ActionResponse | null,
  formData: { report_id: string; parent_id?: string | null; body: string },
): Promise<ActionResponse> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be signed in to comment" };
    }

    const body = formData.body.trim();
    if (!body || body.length > 2000) {
      return { success: false, error: "Comment must be between 1 and 2000 characters" };
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("report_comments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", twentyFourHoursAgo);

    if (countError) {
      return { success: false, error: "Failed to verify comment limit" };
    }

    if (count !== null && count >= 30) {
      return {
        success: false,
        error: "You have reached the maximum of 30 comments in 24 hours. Please try again later.",
      };
    }

    const { data: report } = await supabase
      .from("reports")
      .select("status, submitted_by_id, title")
      .eq("id", formData.report_id)
      .single();

    if (!report || !["APPROVED", "RESOLVED"].includes(report.status)) {
      return { success: false, error: "Cannot comment on this report" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const { data: comment, error: insertError } = await supabase
      .from("report_comments")
      .insert({
        report_id: formData.report_id,
        user_id: user.id,
        parent_id: formData.parent_id ?? null,
        body,
        author_name: profile?.full_name ?? "Anonymous",
      })
      .select("*")
      .single();

    if (insertError) {
      return { success: false, error: "Failed to post comment. Please try again." };
    }

    if (report.submitted_by_id !== user.id) {
      const adminClient = createAdminClient();
      const message = `${profile?.full_name ?? "Someone"} commented on the report "${report.title}".`;
      await adminClient.from("notifications").insert({
        user_id: report.submitted_by_id,
        report_id: formData.report_id,
        type: "COMMENT_ADDED",
        message,
      });
      sendPushNotification(
        report.submitted_by_id,
        "New Comment",
        message,
        `/reports/${formData.report_id}`,
      ).catch((err) => console.error("Push failed for comment:", err));
    }

    return { success: true, data: comment as { id: string } };
  } catch {
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

export async function editComment(
  _prevState: ActionResponse | null,
  formData: { comment_id: string; body: string },
): Promise<ActionResponse> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be signed in to edit a comment" };
    }

    const body = formData.body.trim();
    if (!body || body.length > 2000) {
      return { success: false, error: "Comment must be between 1 and 2000 characters" };
    }

    const { error: updateError } = await supabase
      .from("report_comments")
      .update({ body, updated_at: new Date().toISOString() })
      .eq("id", formData.comment_id)
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, error: "Failed to edit comment" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

export async function deleteComment(
  commentId: string,
): Promise<ActionResponse> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be signed in to delete a comment" };
    }

    const { error: deleteError } = await supabase
      .from("report_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (deleteError) {
      return { success: false, error: "Failed to delete comment" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

export async function updateProfileSettings(
  formData: UpdateProfileSettingsInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be signed in to update settings" };
    }

    const parsed = updateProfileSettingsSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const normalizedPhone = parsed.data.phone
      ? normalizePhoneNumber(parsed.data.phone)
      : null;

    if (parsed.data.phone && !normalizedPhone) {
      return { success: false, error: "Enter a valid Philippine mobile number" };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        phone: normalizedPhone,
        sms_notifications: parsed.data.sms_notifications,
      })
      .eq("id", user.id);

    if (error) {
      return { success: false, error: "Failed to save settings. Please try again." };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

export async function sendTestSms(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be signed in" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, sms_notifications")
      .eq("id", user.id)
      .single();

    if (!profile?.phone || !profile.sms_notifications) {
      return { success: false, error: "Set your phone number and enable SMS first" };
    }

    const adminClient = createAdminClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await adminClient
      .from("test_sms_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);

    if ((count ?? 0) >= 5) {
      return { success: false, error: "You've reached the limit of 5 test SMS per day. Try again tomorrow." };
    }

    const result = await sendSMS(
      profile.phone,
      "Bantay Kalsada: This is a test SMS. Your notification settings are working!",
    );

    if (result.success) {
      await adminClient.from("test_sms_log").insert({ user_id: user.id });
    }

    return result;
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function savePushSubscription(
  userId: string,
  subscriptionJson: string,
): Promise<ActionResponse> {
  try {
    const subscription = JSON.parse(subscriptionJson) as PushSubscriptionJSON;

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    if (user.id !== userId) {
      return { success: false, error: "Forbidden" };
    }

    const existing = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("subscription->>endpoint", subscription.endpoint)
      .maybeSingle();

    if (existing.data) {
      return { success: true };
    }

    const { error: insertError } = await supabase
      .from("push_subscriptions")
      .insert({
        user_id: userId,
        subscription: subscription as unknown as never,
      });

    if (insertError) {
      return { success: false, error: "Failed to save push subscription" };
    }

    return { success: true };
  } catch (err) {
    console.error("savePushSubscription error:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function flagReport(
  reportId: string,
  flagType: "ALREADY_FIXED" | "WRONG_LOCATION",
): Promise<{ success: boolean; error?: string; active?: boolean }> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be signed in to flag a report" };
    }

    const parsed = flagReportSchema.safeParse({ reportId, flagType });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues.map((e) => e.message).join(", ") };
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("report_flags")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", twentyFourHoursAgo);

    if (countError) {
      return { success: false, error: "Failed to verify flag limit" };
    }

    if (count !== null && count >= 30) {
      return {
        success: false,
        error: "You have reached the maximum of 30 flag actions in 24 hours. Please try again later.",
      };
    }

    const { data: report } = await supabase
      .from("reports")
      .select("title, status, submitted_by_id")
      .eq("id", reportId)
      .single();

    if (!report) {
      return { success: false, error: "Report not found" };
    }

    if (report.submitted_by_id === user.id) {
      return { success: false, error: "You cannot flag your own report" };
    }

    if (report.status !== "APPROVED" && report.status !== "RESOLVED") {
      return { success: false, error: "This report cannot be flagged" };
    }

    const { data: existing } = await supabase
      .from("report_flags")
      .select("id")
      .eq("report_id", reportId)
      .eq("user_id", user.id)
      .eq("flag_type", parsed.data.flagType)
      .maybeSingle();

    if (existing) {
      const { error: deleteError } = await supabase
        .from("report_flags")
        .delete()
        .eq("id", existing.id);
      if (deleteError) {
        return { success: false, error: "Failed to remove flag" };
      }
      return { success: true, active: false };
    }

    const { error: insertError } = await supabase
      .from("report_flags")
      .insert({
        report_id: reportId,
        user_id: user.id,
        flag_type: parsed.data.flagType,
      });

    if (insertError) {
      return { success: false, error: "Failed to flag report. Please try again." };
    }

    const adminClient = createAdminClient();
    const { data: admins } = await adminClient
      .from("profiles")
      .select("id")
      .eq("role", "ADMIN");

    const label = parsed.data.flagType === "ALREADY_FIXED" ? "already fixed" : "wrong location";
    const message = `Report "${report.title}" was flagged as ${label}.`;

    if (admins) {
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          reportId,
          type: "REPORT_FLAGGED",
          message,
        });
      }
    }

    return { success: true, active: true };
  } catch (err) {
    console.error("flagReport error:", err);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}
