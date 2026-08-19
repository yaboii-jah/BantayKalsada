import type { Database } from "@/types/database.types";

type ReportCategory = Database["public"]["Enums"]["report_category"];
type Barangay = Database["public"]["Enums"]["barangay"];

export interface ReportFilterParams {
  q?: string;
  category?: ReportCategory;
  barangay?: Barangay;
}

const REPORT_CATEGORY_VALUES = new Set<string>([
  "POTHOLE",
  "FLOODED_ROAD",
  "ROAD_ACCIDENT",
  "ROAD_RAGE",
  "BROKEN_TRAFFIC_SIGN",
  "OTHER",
]);

const BARANGAY_VALUES = new Set<string>([
  "DOLORES",
  "SAN_ISIDRO",
  "SAN_JUAN",
  "SANTA_ANA",
  "MUZON",
]);

export function parseReportFilterParams(searchParams: {
  q?: string | string[];
  category?: string | string[];
  barangay?: string | string[];
}): ReportFilterParams {
  const clean = (value: string | string[] | undefined) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined;

  const q = clean(searchParams.q);
  const category = clean(searchParams.category);
  const barangay = clean(searchParams.barangay);

  return {
    q,
    category:
      category && REPORT_CATEGORY_VALUES.has(category)
        ? (category as ReportCategory)
        : undefined,
    barangay:
      barangay && BARANGAY_VALUES.has(barangay)
        ? (barangay as Barangay)
        : undefined,
  };
}

export function buildAdminListHref(
  base: string,
  page: number,
  filters: ReportFilterParams,
): string {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.barangay) params.set("barangay", filters.barangay);
  return `${base}?${params.toString()}`;
}

export function hasReportFilters(filters: ReportFilterParams): boolean {
  return Boolean(filters.q || filters.category || filters.barangay);
}
