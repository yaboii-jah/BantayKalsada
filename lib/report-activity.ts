import { createAdminClient } from "@/lib/supabase/service-role";
import type { Database, Json } from "@/types/database.types";

export type ReportActivityAction =
  Database["public"]["Enums"]["report_activity_action"];

export interface LogReportActivityParams {
  reportId: string;
  actorId: string | null;
  action: ReportActivityAction;
  detail?: Record<string, unknown> | null;
}

/**
 * Writes an entry to the report_activity_log audit trail.
 *
 * Uses the service-role client because the table has RLS enabled with no
 * policies (service-role only, same as api_request_log). Safe to call from
 * both citizen actions (app/actions.ts) and admin actions
 * (app/admin/actions.ts).
 */
export async function logReportActivity(
  params: LogReportActivityParams,
): Promise<void> {
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("report_activity_log").insert({
    report_id: params.reportId,
    actor_id: params.actorId,
    action: params.action,
    detail: (params.detail as Json | null) ?? null,
  });
  if (error) {
    console.error("Failed to log report activity:", error.message);
  }
}
