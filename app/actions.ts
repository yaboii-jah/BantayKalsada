"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service-role";
import { createReportSchema, type CreateReportInput } from "@/lib/validations/report";

export interface ActionResponse {
  success: boolean;
  data?: { id: string };
  error?: string;
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

    const adminClient = createAdminClient();
    const { error } = await adminClient
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

    const adminClient = createAdminClient();
    const { error } = await adminClient
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
      return {
        success: false,
        error: "You have reached the maximum of 5 reports in 24 hours. Please try again later.",
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

    return { success: true, data: { id: report.id } };
  } catch {
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}
