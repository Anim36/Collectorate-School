import { z } from "zod";

/**
 * The rules for the admin forms.
 *
 * They live here so the client forms and the server actions hold the same
 * standard.
 */

/** The rule a temporary password has to follow. */
export const temporaryPasswordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .regex(/\d/, "Include a number in the password");

/** The roles an admin can create. */
export const assignableRoleSchema = z.enum(["STUDENT", "TEACHER"]);

/** The add-user form. */
export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Enter the full name"),
  role: assignableRoleSchema,
  classId: z.string().trim().optional(),
  department: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => value === undefined || value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid email address",
    ),
  password: temporaryPasswordSchema,
});

/** The edit-user form. */
export const editUserSchema = z.object({
  userId: z.string().trim().min(1),
  name: z.string().trim().min(2, "Enter the full name"),
  classId: z.string().trim().optional(),
  department: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  guardianName: z.string().trim().optional(),
  guardianPhone: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => value === undefined || value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid email address",
    ),
});

/** The status filter of the users table. */
export const userStatusSchema = z.enum(["ALL", "ACTIVE", "INACTIVE"]);

/** The role filter of the users table. */
export const userRoleFilterSchema = z.enum([
  "ALL",
  "STUDENT",
  "TEACHER",
  "ADMIN",
]);

/** The list query of the users table. */
export const listUsersSchema = z.object({
  query: z.string().trim().max(120).optional(),
  role: userRoleFilterSchema.default("ALL"),
  status: userStatusSchema.default("ALL"),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(10),
});

/** The validated list query. */
export type ListUsersInput = z.infer<typeof listUsersSchema>;

/** The create-user input. */
export type CreateUserInput = z.infer<typeof createUserSchema>;

/** The edit-user input. */
export type EditUserInput = z.infer<typeof editUserSchema>;

/**
 * The answer every service call gives.
 *
 * A refusal carries the machine readable reason as well as the message, so a
 * check can tell an empty file from a file of an unknown type.
 */
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; reason?: ServiceRejection };

/** The reasons a service refuses a request for. */
export type ServiceRejection =
  | "EMPTY"
  | "TOO_LARGE"
  | "TOO_MANY"
  | "UNKNOWN_TYPE"
  | "INVALID";
