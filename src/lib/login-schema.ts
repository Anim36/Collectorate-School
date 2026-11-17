import { z } from "zod";

/**
 * The rules the sign-in forms share.
 *
 * The student and teacher page and the admin page both use them, so a
 * message never names a role the visitor did not pick.
 */

/**
 * The role a sign-in may be made from.
 *
 * The tab the user pressed is sent with the form and is checked against the
 * account's real role on the server.
 */
export const loginRoleSchema = z.enum(["STUDENT", "TEACHER", "ADMIN"]);

/** The roles a sign-in may be made from. */
export type LoginRole = z.infer<typeof loginRoleSchema>;

/**
 * The wording of one sign-in entry point.
 *
 * The label and the placeholder follow the tab, so the form says the same
 * thing the user was asked for.
 */
export interface LoginEntryCopy {
  /** The label above the id field. */
  label: string;
  /** The placeholder inside the id field. */
  placeholder: string;
  /** The message shown when the field is empty. */
  emptyMessage: string;
  /** The message shown when the field is not a valid id. */
  invalidMessage: string;
}

/** The wording of the student tab. */
export const STUDENT_ENTRY_COPY: LoginEntryCopy = {
  label: "Student ID / email",
  placeholder: "e.g. ST-2026-0042",
  emptyMessage: "Enter your student ID or email address",
  invalidMessage: "Enter a valid student ID or email address",
};

/** The wording of the teacher tab. */
export const TEACHER_ENTRY_COPY: LoginEntryCopy = {
  label: "Teacher ID / email",
  placeholder: "e.g. teacher-nusrat-jahan",
  emptyMessage: "Enter your teacher ID or email address",
  invalidMessage: "Enter a valid teacher ID or email address",
};

/** The wording of the admin sign-in page. */
export const ADMIN_ENTRY_COPY: LoginEntryCopy = {
  label: "Admin ID / email",
  placeholder: "e.g. admin",
  emptyMessage: "Enter your admin ID or email address",
  invalidMessage: "Enter a valid admin ID or email address",
};

/**
 * The sign-in form, validated on the client.
 *
 * The role is a field of the form, so switching the tab sends the role that
 * was on screen.
 */
export function buildLoginSchema(copy: LoginEntryCopy) {
  return z.object({
    role: loginRoleSchema,
    identifier: z
      .string()
      .min(1, copy.emptyMessage)
      .refine(
        (value) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value.trim()),
        copy.invalidMessage,
      ),
    password: z.string().min(1, "Enter your password"),
  });
}
