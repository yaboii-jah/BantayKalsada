import { z } from "zod";

export const addCommentSchema = z.object({
  report_id: z.string().uuid("Invalid report id"),
  parent_id: z.string().uuid("Invalid parent comment").nullable().optional(),
  body: z
    .string()
    .trim()
    .min(1, "Comment must be at least 1 character")
    .max(2000, "Comment must be at most 2000 characters"),
});

export const editCommentSchema = z.object({
  comment_id: z.string().uuid("Invalid comment id"),
  body: z
    .string()
    .trim()
    .min(1, "Comment must be at least 1 character")
    .max(2000, "Comment must be at most 2000 characters"),
});

export const deleteCommentSchema = z.object({
  comment_id: z.string().uuid("Invalid comment id"),
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type EditCommentInput = z.infer<typeof editCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
