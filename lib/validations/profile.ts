import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^(?:\+63|0)?9\d{9}$/,
    "Enter a valid Philippine mobile number (e.g. 09XXXXXXXXX)",
  );

export const updateProfileSettingsSchema = z.object({
  phone: phoneSchema.nullable(),
  sms_notifications: z.boolean(),
});

export type UpdateProfileSettingsInput = z.infer<
  typeof updateProfileSettingsSchema
>;
