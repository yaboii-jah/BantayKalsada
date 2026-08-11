import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDisplayUrl } from "@/lib/cloudinary-url";
import { publicReportSchema, type PaginationMeta, type PublicReport } from "@/lib/validations/api";
import type { Database } from "@/types/database.types";

type ReportRow = Database["public"]["Tables"]["reports"]["Row"];

const PUBLIC_STATUSES: Database["public"]["Enums"]["report_status"][] = [
  "APPROVED",
  "RESOLVED",
];

/**
 * Curated public contract: whitelist the fields a third-party consumer may see.
 * Rejection reasons (private to the submitter), user IDs, reviewer info, and the
 * PostGIS `location` column are never exposed. Photo URLs are rewritten to the
 * Asia/Pacific Cloudinary CDN so they are actually loadable.
 */
export function serializePublicReport(row: ReportRow): PublicReport {
  if (row.status !== "APPROVED" && row.status !== "RESOLVED") {
    throw new Error("Non-public report passed to public serializer");
  }
  return publicReportSchema.parse({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    severity: row.severity,
    barangay: row.barangay,
    status: row.status,
    latitude: row.latitude,
    longitude: row.longitude,
    location_label: row.location_label,
    photo_urls: (row.photo_urls ?? []).map(getDisplayUrl),
    resolution_notes: row.resolution_notes,
    submitted_at: row.submitted_at,
    resolved_at: row.resolved_at,
  });
}

export interface ListReportsOptions {
  category?: string;
  severity?: string;
  status?: string;
  barangay?: string;
  q?: string;
  page: number;
  page_size: number;
}

export interface ReportListData {
  reports: PublicReport[];
  pagination: PaginationMeta;
}

export function sanitizeSearchTerm(q: string): string {
  return q.replace(/[%_.,()]/g, "").trim();
}

export async function fetchPublicReports(
  options: ListReportsOptions,
): Promise<ReportListData> {
  const supabase = await createSupabaseServerClient();
  const from = (options.page - 1) * options.page_size;
  const to = from + options.page_size - 1;

  let query = supabase
    .from("reports")
    .select("*", { count: "exact" })
    .in("status", PUBLIC_STATUSES)
    .order("submitted_at", { ascending: false });

  if (options.category) query = query.eq("category", options.category);
  if (options.severity) query = query.eq("severity", options.severity);
  if (options.status) query = query.in("status", [options.status]);
  if (options.barangay) query = query.eq("barangay", options.barangay);

  const searchTerm = options.q ? sanitizeSearchTerm(options.q) : "";
  if (searchTerm) {
    const pattern = `%${searchTerm}%`;
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`);
  }

  const { data, count } = await query.range(from, to);

  const total = count ?? 0;
  const reports = (data ?? []).map(serializePublicReport);

  return {
    reports,
    pagination: {
      page: options.page,
      page_size: options.page_size,
      total,
      total_pages: Math.ceil(total / options.page_size),
    },
  };
}

export async function fetchPublicReportById(id: string): Promise<PublicReport | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .in("status", PUBLIC_STATUSES)
    .maybeSingle();

  return data ? serializePublicReport(data) : null;
}
