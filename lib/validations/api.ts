import { z } from "zod";
import { reportCategoryEnum, reportSeverityEnum, barangayEnum } from "./report";

export const apiReportStatusEnum = z.enum(["APPROVED", "RESOLVED"]);

export const listReportsQuerySchema = z.object({
  category: reportCategoryEnum.optional(),
  severity: reportSeverityEnum.optional(),
  status: apiReportStatusEnum.optional(),
  barangay: barangayEnum.optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  page_size: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;

export const reportParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ReportParams = z.infer<typeof reportParamsSchema>;

export const publicReportSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  category: reportCategoryEnum,
  severity: reportSeverityEnum,
  barangay: barangayEnum.nullable(),
  status: apiReportStatusEnum,
  latitude: z.number(),
  longitude: z.number(),
  location_label: z.string().nullable(),
  photo_urls: z.array(z.string().url()),
  resolution_notes: z.string().nullable(),
  submitted_at: z.string(),
  resolved_at: z.string().nullable(),
});

export type PublicReport = z.infer<typeof publicReportSchema>;

export const paginationMetaSchema = z.object({
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export const reportListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    reports: z.array(publicReportSchema),
    pagination: paginationMetaSchema,
  }),
});

export const reportDetailResponseSchema = z.object({
  success: z.literal(true),
  data: publicReportSchema,
});
