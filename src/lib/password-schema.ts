import { z } from "zod";

/**
 * The password rules.
 *
 * They live here so the change-password form and the server action that
 * runs behind it enforce exactly the same rules.
 */

/** The rule a new password has to follow. */
export const newPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/\d/, "Include a number in your password");

/** The whole change-password form. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "Your new password must be different from the current one",
    path: ["newPassword"],
  });

/** The validated change-password input. */
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
