import { z } from "zod";

export const reportCategoryEnum = z.enum([
  "POTHOLE",
  "FLOODED_ROAD",
  "ROAD_ACCIDENT",
  "ROAD_RAGE",
  "BROKEN_TRAFFIC_SIGN",
  "OTHER",
]);

export const reportSeverityEnum = z.enum(["MINOR", "URGENT", "EMERGENCY"]);

export const barangayEnum = z.enum([
  "DOLORES",
  "SAN_ISIDRO",
  "SAN_JUAN",
  "SANTA_ANA",
  "MUZON",
]);

export const createReportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be at most 100 characters"),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(1000, "Description must be at most 1000 characters"),
  category: reportCategoryEnum,
  barangay: barangayEnum,
  photo_urls: z
    .array(z.string().url())
    .min(1, "At least one photo is required")
    .max(3, "Maximum of 3 photos allowed"),
  latitude: z
    .number()
    .min(-90, "Invalid latitude")
    .max(90, "Invalid latitude"),
  longitude: z
    .number()
    .min(-180, "Invalid longitude")
    .max(180, "Invalid longitude"),
  location_label: z.string().trim().max(255).optional(),
  severity: reportSeverityEnum,
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const approveReportSchema = z.object({
  reportId: z.string().uuid(),
});

export const rejectReportSchema = z.object({
  reportId: z.string().uuid(),
  rejectionReason: z
    .string()
    .trim()
    .min(10, "Rejection reason must be at least 10 characters"),
});

export const resolveReportSchema = z.object({
  reportId: z.string().uuid(),
  resolutionNotes: z.string().max(2000).optional(),
  resolvedImageUrls: z.array(z.string()).min(1).max(3).optional(),
});

export const reportFlagTypeEnum = z.enum(["ALREADY_FIXED", "WRONG_LOCATION"]);

export const flagReportSchema = z.object({
  reportId: z.string().uuid(),
  flagType: reportFlagTypeEnum,
});

export type ApproveReportInput = z.infer<typeof approveReportSchema>;
export type RejectReportInput = z.infer<typeof rejectReportSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
export type FlagReportInput = z.infer<typeof flagReportSchema>;
