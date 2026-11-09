import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/server/db";
import {
  BCRYPT_COST,
  DUMMY_PASSWORD_HASH,
  GENERIC_AUTH_ERROR,
  LOCKOUT_MINUTES,
  MAX_FAILED_LOGINS,
  type SessionRole,
} from "@/server/auth-types";
import { loginRoleSchema, type LoginRole } from "@/lib/login-schema";

/**
 * The sign-in form, validated before anything touches the database.
 *
 * The role is the entry point the sign-in was made from. It is checked
 * against the account's real role afterwards, so a student cannot reach the
 * teacher portal by asking for it.
 */
export const loginSchema = z.object({
  loginId: z
    .string()
    .trim()
    .min(1, "Enter your ID")
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Enter a valid ID"),
  password: z.string().min(1, "Enter your password"),
  role: loginRoleSchema,
});

/** The validated sign-in input. */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * The role the account has to hold for each entry point.
 *
 * A student signs in from the student tab, a teacher from the teacher tab and
 * an admin from the admin sign-in page. Nothing else is accepted.
 */
const ROLE_FOR_ENTRY: Record<LoginRole, SessionRole> = {
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  ADMIN: "ADMIN",
};

/**
 * Why a sign-in was refused.
 *
 * The codes are written to the audit log so the school can review them, but
 * they never reach the browser: the caller always shows the one generic
 * message.
 */
export type LoginFailureReason =
  | "unknown_id"
  | "wrong_password"
  | "inactive"
  | "locked"
  | "role_mismatch";

/** The outcome of a sign-in attempt. */
export type LoginResult =
  | {
      ok: true;
      userId: string;
      role: string;
      name: string;
      /** Whether the account still has to replace its temporary password. */
      mustChangePassword: boolean;
      /** The session version the account is on. */
      sessionVersion: number;
    }
  | { ok: false; reason: LoginFailureReason };

/**
 * Refuses a sign-in.
 *
 * Every failure — unknown id, wrong password, deactivated, locked or a role
 * that does not match the tab — returns the same message and the same
 * shape, so the form never tells an attacker which part of the guess was
 * right.
 */
function refuse(reason: LoginFailureReason): LoginResult {
  void reason;
  return { ok: false, reason };
}

/**
 * Writes an audit row.
 *
 * The login id that was attempted is recorded, never the password.
 */
async function writeAudit(input: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata as never,
      },
    });
  } catch {
    // The audit write must never break a sign-in. If it fails the sign-in
    // still goes through.
  }
}

/**
 * Checks a sign-in.
 *
 * The steps, in order:
 *
 * 1. The input is validated.
 * 2. The account is looked up by its login id.
 * 3. The password is compared with bcrypt — against a dummy hash when the
 *    account does not exist, so the time taken does not reveal whether the
 *    id is real.
 * 4. A locked account is refused, and the failed count is left alone.
 * 5. A deactivated account is refused.
 * 6. An entry point that does not match the account's real role is refused
 *    and counted as a failed attempt.
 * 7. Five consecutive failures lock the account for fifteen minutes.
 * 8. A success resets the counter, records the time and is audited.
 *
 * The sign-in action checks the credentials once to work out where the user
 * belongs, and the credentials provider checks them again before the session
 * is written. The success audit row is written by whichever of the two runs
 * second, so one sign-in leaves one row.
 */
export async function authenticateCredentials(
  raw: LoginInput,
  options: { auditSuccess?: boolean } = {},
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(raw);

  if (!parsed.success) {
    return refuse("unknown_id");
  }

  const { loginId, password, role } = parsed.data;

  // The account is looked up by the normalised login id, so "Admin" and
  // "admin" are the same account.
  const user = await prisma.user.findUnique({
    where: { loginIdNormalized: loginId.trim().toLowerCase() },
  });

  // The comparison always runs, so a sign-in takes the same time whether the
  // account exists or not.
  const passwordMatches = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user) {
    await writeAudit({
      actorId: null,
      action: "Login failed",
      entityType: "Account",
      entityId: loginId,
      metadata: { reason: "unknown_id" },
    });

    return refuse("unknown_id");
  }

  const now = new Date();

  // A locked account is refused with the same message as every other
  // failure. The failed count is left alone, so the lock does not extend
  // itself.
  if (user.lockedUntil && user.lockedUntil > now) {
    await writeAudit({
      actorId: user.id,
      action: "Login refused",
      entityType: "Account",
      entityId: user.loginId,
      metadata: { reason: "locked" },
    });

    return refuse("locked");
  }

  if (!user.isActive) {
    await writeAudit({
      actorId: user.id,
      action: "Login refused",
      entityType: "Account",
      entityId: user.loginId,
      metadata: { reason: "inactive" },
    });

    return refuse("inactive");
  }

  if (!passwordMatches) {
    const failedLoginCount = user.failedLoginCount + 1;
    const locked = failedLoginCount >= MAX_FAILED_LOGINS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount,
        // The lock is set the moment the fifth failure lands.
        lockedUntil: locked
          ? new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000)
          : user.lockedUntil,
      },
    });

    await writeAudit({
      actorId: user.id,
      action: "Login failed",
      entityType: "Account",
      entityId: user.loginId,
      metadata: { reason: "wrong_password", failedLoginCount },
    });

    if (locked) {
      await writeAudit({
        actorId: user.id,
        action: "Account locked",
        entityType: "Account",
        entityId: user.loginId,
        metadata: { minutes: LOCKOUT_MINUTES },
      });
    }

    return refuse("wrong_password");
  }

  // The entry point has to match the account's real role: a student signs in
  // from the student tab, a teacher from the teacher tab and an admin from
  // the admin sign-in page. Nothing else is accepted.
  //
  // The password has already been compared at this point, so a mismatch
  // takes the same time as a wrong password, and it is counted as a failed
  // attempt so the lockout cannot be walked around by using the wrong tab.
  if (user.role !== ROLE_FOR_ENTRY[role]) {
    const failedLoginCount = user.failedLoginCount + 1;
    const locked = failedLoginCount >= MAX_FAILED_LOGINS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount,
        lockedUntil: locked
          ? new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000)
          : user.lockedUntil,
      },
    });

    await writeAudit({
      actorId: user.id,
      action: "Login failed",
      entityType: "Account",
      entityId: user.loginId,
      metadata: { reason: "role_mismatch" },
    });

    if (locked) {
      await writeAudit({
        actorId: user.id,
        action: "Account locked",
        entityType: "Account",
        entityId: user.loginId,
        metadata: { minutes: LOCKOUT_MINUTES },
      });
    }

    return refuse("role_mismatch");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: now,
    },
  });

  if (options.auditSuccess !== false) {
    await writeAudit({
      actorId: user.id,
      action: "Login successful",
      entityType: "Account",
      entityId: user.loginId,
      metadata: { role: user.role },
    });
  }

  return {
    ok: true,
    userId: user.id,
    role: user.role,
    name: user.name,
    mustChangePassword: user.mustChangePassword,
    sessionVersion: user.sessionVersion,
  };
}

/**
 * Checks a current password against an account.
 *
 * It runs a bcrypt comparison either way, so the time taken does not reveal
 * whether the account exists.
 */
export async function verifyCurrentPassword(
  userId: string,
  password: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  const matches = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  return Boolean(user) && matches;
}

/**
 * The outcome of a password-change attempt.
 */
export type ChangePasswordCheck =
  | { ok: true }
  | { ok: false; reason: "locked" | "wrong_password" };

/**
 * Checks a password change and applies it.
 *
 * The current password has to be right. A wrong one counts towards the
 * same lockout a wrong sign-in does, so the change cannot be used to guess
 * the current password without being locked out.
 */
export async function checkAndChangePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordCheck> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) return { ok: false, reason: "wrong_password" };

  const now = new Date();

  if (user.lockedUntil && user.lockedUntil > now) {
    return { ok: false, reason: "locked" };
  }

  const matches = await bcrypt.compare(
    currentPassword,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!matches) {
    const failedLoginCount = user.failedLoginCount + 1;
    const locked = failedLoginCount >= MAX_FAILED_LOGINS;

    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount,
        lockedUntil: locked
          ? new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000)
          : user.lockedUntil,
      },
    });

    await writeAudit({
      actorId: userId,
      action: "Password change refused",
      entityType: "Account",
      entityId: user.loginId,
      metadata: { reason: "wrong_password", failedLoginCount },
    });

    if (locked) {
      await writeAudit({
        actorId: userId,
        action: "Account locked",
        entityType: "Account",
        entityId: user.loginId,
        metadata: { minutes: LOCKOUT_MINUTES },
      });
    }

    return { ok: false, reason: "wrong_password" };
  }

  await changePassword(userId, newPassword);

  return { ok: true };
}

/**
 * Replaces the password of an account.
 *
 * The new hash is written with a bumped session version, so every session
 * made before the change stops working and the user signs in again with the
 * new password.
 */
export async function changePassword(
  userId: string,
  newPassword: string,
): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: false,
      failedLoginCount: 0,
      lockedUntil: null,
      sessionVersion: { increment: 1 },
    },
  });

  await writeAudit({
    actorId: userId,
    action: "Password changed",
    entityType: "Account",
    entityId: userId,
  });
}

/**
 * The session claims of an account, read from the database.
 *
 * The session cookie is signed, so it cannot be edited, but it can go stale:
 * a password change clears the "must change" flag and moves the session
 * version on. The claims are read from the row again so the session that is
 * re-issued carries what the row actually says.
 *
 * Nothing sent by the browser is trusted here: the claims come from the row
 * that belongs to the id on the token.
 */
export async function readSessionClaims(userId: string): Promise<{
  mustChangePassword: boolean;
  sessionVersion: number;
} | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mustChangePassword: true, sessionVersion: true },
  });

  if (!user) return null;

  return {
    mustChangePassword: user.mustChangePassword,
    sessionVersion: user.sessionVersion,
  };
}

/**
 * Records a sign-out.
 */
export async function recordLogout(userId: string): Promise<void> {
  await writeAudit({
    actorId: userId,
    action: "Signed out",
    entityType: "Account",
    entityId: userId,
  });
}

export { GENERIC_AUTH_ERROR };
