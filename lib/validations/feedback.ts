import { z } from "zod";

export const feedbackTypeEnum = z.enum([
  "BUG_REPORT",
  "FEATURE_REQUEST",
  "GENERAL",
]);

export const createFeedbackSchema = z.object({
  type: feedbackTypeEnum,
  title: z
    .string()
    .trim()
    .min(10, "Title must be at least 10 characters")
    .max(100, "Title must be at most 100 characters"),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description must be at most 2000 characters"),
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5")
    .optional()
    .nullable(),
  photo_urls: z.array(z.string().url()).max(3),
});

export const acknowledgeFeedbackSchema = z.object({
  feedbackId: z.string().uuid(),
});

export const closeFeedbackSchema = z.object({
  feedbackId: z.string().uuid(),
});

export const updateFeedbackNoteSchema = z.object({
  feedbackId: z.string().uuid(),
  adminNote: z
    .string()
    .trim()
    .max(500, "Note must be at most 500 characters")
    .nullable(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type AcknowledgeFeedbackInput = z.infer<typeof acknowledgeFeedbackSchema>;
export type CloseFeedbackInput = z.infer<typeof closeFeedbackSchema>;
export type UpdateFeedbackNoteInput = z.infer<typeof updateFeedbackNoteSchema>;
