import { z } from "zod";

/**
 * The password rules.
 *
 * They live here so the change-password form and the server action that
 * runs behind it enforce exactly the same rules, and so the checklist the
 * form shows is written from the same source as the validation.
 */

/**
 * The rule a new password has to follow.
 *
 * The minimum length and the digit are the whole rule: nothing else is
 * required, so nothing else is promised on screen.
 */
export const newPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/\d/, "Include a number in your password");

/**
 * One line of the on-screen checklist.
 *
 * The line is built from the rule itself, so the checklist cannot drift
 * away from what the form actually accepts.
 */
export interface PasswordRule {
  /** The text shown to the user. */
  label: string;
  /** Whether the password the user has typed so far satisfies the rule. */
  met: (value: string) => boolean;
}

/**
 * The rules the checklist shows, in the order Figma lists them.
 *
 * The checklist is three lines of 19px copy, so it stays three lines.
 */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    label: "At least 12 characters",
    met: (value) => value.length >= 12,
  },
  {
    label: "Include a number",
    met: (value) => /\d/.test(value),
  },
  {
    label: "No spaces",
    met: (value) => !/\s/.test(value),
  },
];

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
