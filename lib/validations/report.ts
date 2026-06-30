import { z } from "zod";

export const reportCategoryEnum = z.enum([
  "POTHOLE",
  "FLOODED_ROAD",
  "ROAD_ACCIDENT",
  "ROAD_RAGE",
  "BROKEN_TRAFFIC_SIGN",
  "OTHER",
]);

export const createReportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(120, "Title must be at most 120 characters"),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description must be at most 2000 characters"),
  category: reportCategoryEnum,
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
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
