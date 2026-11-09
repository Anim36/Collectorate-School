/**
 * The shape of the session, shared by the auth config, the middleware and the
 * server-side guards.
 *
 * The session carries only what the shell needs to draw the signed-in user
 * and to decide where to send them. The password hash, the email and every
 * other column of the user row stay in the database.
 */

/** The role a session belongs to. */
export type SessionRole = "ADMIN" | "TEACHER" | "STUDENT";

/**
 * The claims the session token carries.
 *
 * `sessionVersion` is compared against the row on every protected request, so
 * a session made before a password change or a deactivation stops working.
 */
export interface SessionUser {
  /** The id of the user row. */
  id: string;
  /** The role, which decides the portal the shell shows. */
  role: SessionRole;
  /** The name the shell shows in the top bar. */
  name: string;
  /** Whether the user still has to replace their temporary password. */
  mustChangePassword: boolean;
  /** The version the session was issued against. */
  sessionVersion: number;
}

/** The role each portal belongs to. */
export const ROLE_PORTAL: Record<SessionRole, string> = {
  STUDENT: "student",
  TEACHER: "teacher",
  ADMIN: "admin",
};

/** The dashboard each role lands on after signing in. */
export const ROLE_HOME: Record<SessionRole, string> = {
  STUDENT: "/student/dashboard",
  TEACHER: "/teacher/dashboard",
  ADMIN: "/admin/dashboard",
};

/**
 * The message every failed sign-in returns.
 *
 * Unknown id, wrong password, deactivated account, locked account and a role
 * that does not match the tab all produce this one message, so the form
 * never tells an attacker which half of the guess was right.
 */
export const GENERIC_AUTH_ERROR = "Invalid ID or password";

/** The number of failed attempts that lock an account. */
export const MAX_FAILED_LOGINS = 5;

/** How long an account stays locked, in minutes. */
export const LOCKOUT_MINUTES = 15;

/** How long a session lasts, in seconds. Eight hours. */
export const SESSION_MAX_AGE = 8 * 60 * 60;

/** The bcryptjs cost every password hash is made with. */
export const BCRYPT_COST = 12;

/**
 * The hash a sign-in is compared against when the account does not exist.
 *
 * Running a real comparison against it keeps the time a failed sign-in takes
 * the same whether the id exists or not.
 */
export const DUMMY_PASSWORD_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.7b6FQzvQeMPOA6vYjN9d1pqXwC0hEiC";
