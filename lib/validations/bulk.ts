import { z } from "zod";

export const bulkActionSchema = z.object({
  reportIds: z.array(z.string().uuid()).min(1).max(50),
});

export const bulkRejectSchema = bulkActionSchema.extend({
  rejectionReason: z.string().trim().min(10),
});
