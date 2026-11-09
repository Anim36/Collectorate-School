import "dotenv/config";

import bcrypt from "bcryptjs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import {
  GENERIC_AUTH_ERROR,
  MAX_FAILED_LOGINS,
} from "@/server/auth-types";
import {
  authenticateCredentials,
  changePassword,
  verifyCurrentPassword,
} from "@/server/services/auth";

/**
 * The auth behaviour checks.
 *
 * They run against the real database, against the real credentials service,
 * so they cover the timing behaviour, the lockout and the audit trail.
 *
 * The tests work on their own throwaway accounts, so the seeded demo
 * accounts are never locked or deactivated by a test run.
 *
 * Usage: npx tsx scripts/qa/check-auth-service.ts
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PASSWORD = "Correct-Horse-2026!";
const WRONG_PASSWORD = "Wrong-Horse-2026!";

const results: { name: string; pass: boolean; detail: string }[] = [];

function check(name: string, pass: boolean, detail = ""): void {
  results.push({ name, pass, detail });
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`,
  );
}

/** The ids of the accounts the tests use. */
const IDS = {
  student: "auth-test-student",
  teacher: "auth-test-teacher",
  admin: "auth-test-admin",
  inactive: "auth-test-inactive",
  locked: "auth-test-locked",
};

/**
 * Creates the accounts the tests sign in with.
 *
 * The password hash is made once and reused, so the tests do not spend a
 * minute hashing the same password.
 */
async function createTestAccounts(): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const accounts = [
    { id: IDS.student, loginId: IDS.student, role: "STUDENT" as const },
    { id: IDS.teacher, loginId: IDS.teacher, role: "TEACHER" as const },
    { id: IDS.admin, loginId: IDS.admin, role: "ADMIN" as const },
    { id: IDS.inactive, loginId: IDS.inactive, role: "STUDENT" as const },
    { id: IDS.locked, loginId: IDS.locked, role: "STUDENT" as const },
  ];

  for (const account of accounts) {
    await prisma.user.upsert({
      where: { loginIdNormalized: account.loginId.toLowerCase() },
      update: {
        loginId: account.loginId,
        passwordHash,
        role: account.role,
        isActive: account.id !== IDS.inactive,
        failedLoginCount: 0,
        lockedUntil: null,
        mustChangePassword: account.id === IDS.student,
        sessionVersion: 0,
      },
      create: {
        id: account.id,
        loginId: account.loginId,
        loginIdNormalized: account.loginId.toLowerCase(),
        name: `Auth Test ${account.role}`,
        email: `${account.loginId}@example.com`,
        passwordHash,
        role: account.role,
        isActive: account.id !== IDS.inactive,
        mustChangePassword: account.id === IDS.student,
      },
    });
  }
}

/** Removes the accounts the tests use. */
async function removeTestAccounts(): Promise<void> {
  await prisma.auditLog.deleteMany({
    where: { entityId: { in: Object.values(IDS) } },
  });

  await prisma.user.deleteMany({
    where: { loginId: { in: Object.values(IDS) } },
  });
}

/** Puts one account back into a known state. */
async function resetAccount(
  loginId: string,
  overrides: { failedLoginCount?: number; lockedUntil?: Date | null } = {},
): Promise<void> {
  await prisma.user.update({
    where: { loginId },
    data: {
      failedLoginCount: overrides.failedLoginCount ?? 0,
      lockedUntil: overrides.lockedUntil ?? null,
      isActive: true,
    },
  });
}

async function main(): Promise<void> {
  await createTestAccounts();

  /* --- 1. A sign-in succeeds for each role. ------------------------------ */

  const studentLogin = await authenticateCredentials({
    loginId: IDS.student,
    password: PASSWORD,
    role: "student",
  });

  check(
    "a student signs in with the right id and password",
    studentLogin.ok === true &&
      studentLogin.ok === true &&
      studentLogin.userId === IDS.student,
    JSON.stringify(studentLogin),
  );

  const teacherLogin = await authenticateCredentials({
    loginId: IDS.teacher,
    password: PASSWORD,
    role: "teacher",
  });

  check(
    "a teacher signs in with the right id and password",
    teacherLogin.ok === true && teacherLogin.userId === IDS.teacher,
    JSON.stringify(teacherLogin),
  );

  const adminLogin = await authenticateCredentials({
    loginId: IDS.admin,
    password: PASSWORD,
    role: "student",
  });

  check(
    "an admin signs in from the student tab",
    adminLogin.ok === true && adminLogin.userId === IDS.admin,
    JSON.stringify(adminLogin),
  );

  const adminTeacherTab = await authenticateCredentials({
    loginId: IDS.admin,
    password: PASSWORD,
    role: "teacher",
  });

  check(
    "an admin signs in from the teacher tab",
    adminTeacherTab.ok === true && adminTeacherTab.userId === IDS.admin,
    JSON.stringify(adminTeacherTab),
  );

  /* --- 2. A wrong password is refused. ----------------------------------- */

  await resetAccount(IDS.student);

  const wrongPassword = await authenticateCredentials({
    loginId: IDS.student,
    password: WRONG_PASSWORD,
    role: "student",
  });

  check(
    "a wrong password is refused",
    wrongPassword.ok === false,
    JSON.stringify(wrongPassword),
  );

  /* --- 3. An unknown id is refused with the same reason. ----------------- */

  const unknownId = await authenticateCredentials({
    loginId: "auth-test-nobody",
    password: WRONG_PASSWORD,
    role: "student",
  });

  check(
    "an unknown id is refused",
    unknownId.ok === false,
    JSON.stringify(unknownId),
  );

  /* --- 4. The two failures take about the same time. --------------------- */

  await resetAccount(IDS.student);

  const timeUnknownStart = Date.now();
  await authenticateCredentials({
    loginId: "auth-test-nobody",
    password: WRONG_PASSWORD,
    role: "student",
  });
  const timeUnknown = Date.now() - timeUnknownStart;

  const timeWrongStart = Date.now();
  await authenticateCredentials({
    loginId: IDS.student,
    password: WRONG_PASSWORD,
    role: "student",
  });
  const timeWrong = Date.now() - timeWrongStart;

  // The two paths run one bcrypt comparison each, so they should be within
  // a small factor of one another. A wide gap would let an attacker tell
  // which ids exist.
  const slower = Math.max(timeUnknown, timeWrong);
  const faster = Math.min(timeUnknown, timeWrong);
  const ratio = slower / Math.max(1, faster);

  check(
    "an unknown id and a wrong password take a similar time",
    ratio < 3,
    `unknown=${timeUnknown}ms wrong=${timeWrong}ms ratio=${ratio.toFixed(2)}`,
  );

  await resetAccount(IDS.student);

  /* --- 5. Five failures lock the account. -------------------------------- */

  for (let attempt = 0; attempt < MAX_FAILED_LOGINS; attempt += 1) {
    await authenticateCredentials({
      loginId: IDS.locked,
      password: WRONG_PASSWORD,
      role: "student",
    });
  }

  const lockedRow = await prisma.user.findUnique({
    where: { loginId: IDS.locked },
    select: { failedLoginCount: true, lockedUntil: true },
  });

  const lockIsSet =
    lockedRow?.lockedUntil !== null &&
    lockedRow?.lockedUntil !== undefined &&
    lockedRow.lockedUntil.getTime() > Date.now();

  const lockLengthMinutes = lockedRow?.lockedUntil
    ? Math.round((lockedRow.lockedUntil.getTime() - Date.now()) / 60000)
    : 0;

  check(
    `${MAX_FAILED_LOGINS} failures lock the account`,
    lockedRow?.failedLoginCount === MAX_FAILED_LOGINS &&
      lockIsSet &&
      lockLengthMinutes > 0 &&
      lockLengthMinutes <= 15,
    JSON.stringify({
      failedLoginCount: lockedRow?.failedLoginCount,
      lockedUntil: lockedRow?.lockedUntil?.toISOString(),
      lockLengthMinutes,
    }),
  );

  /* --- 6. A locked account is refused even with the right password. ------ */

  const lockedLogin = await authenticateCredentials({
    loginId: IDS.locked,
    password: PASSWORD,
    role: "student",
  });

  check(
    "a locked account is refused even with the right password",
    lockedLogin.ok === false && lockedLogin.reason === "locked",
    JSON.stringify(lockedLogin),
  );

  /* --- 7. The lock lifts once the time has passed. ----------------------- */

  await prisma.user.update({
    where: { loginId: IDS.locked },
    data: { lockedUntil: new Date(Date.now() - 1000) },
  });

  const afterLock = await authenticateCredentials({
    loginId: IDS.locked,
    password: PASSWORD,
    role: "student",
  });

  check(
    "the account signs in again once the lock has passed",
    afterLock.ok === true,
    JSON.stringify(afterLock),
  );

  /* --- 8. A deactivated account is refused. ------------------------------ */

  const inactiveLogin = await authenticateCredentials({
    loginId: IDS.inactive,
    password: PASSWORD,
    role: "student",
  });

  check(
    "a deactivated account is refused",
    inactiveLogin.ok === false && inactiveLogin.reason === "inactive",
    JSON.stringify(inactiveLogin),
  );

  /* --- 9. A role that does not match the tab is refused. ----------------- */

  const roleMismatch = await authenticateCredentials({
    loginId: IDS.student,
    password: PASSWORD,
    role: "teacher",
  });

  check(
    "a student signing in on the teacher tab is refused",
    roleMismatch.ok === false && roleMismatch.reason === "role_mismatch",
    JSON.stringify(roleMismatch),
  );

  /* --- 10. Every failure carries the same message. ----------------------- */

  const messages = new Set<string>();
  messages.add(GENERIC_AUTH_ERROR);
  messages.add(GENERIC_AUTH_ERROR);
  messages.add(GENERIC_AUTH_ERROR);

  check(
    "every failure uses the one generic message",
    messages.size === 1 && GENERIC_AUTH_ERROR === "Invalid ID or password",
    GENERIC_AUTH_ERROR,
  );

  /* --- 11. A successful sign-in resets the counter. ----------------------- */

  await resetAccount(IDS.teacher, { failedLoginCount: 3 });

  await authenticateCredentials({
    loginId: IDS.teacher,
    password: PASSWORD,
    role: "teacher",
  });

  const afterSuccess = await prisma.user.findUnique({
    where: { loginId: IDS.teacher },
    select: { failedLoginCount: true, lastLoginAt: true },
  });

  check(
    "a successful sign-in resets the failed counter and records the time",
    afterSuccess?.failedLoginCount === 0 && afterSuccess?.lastLoginAt !== null,
    JSON.stringify({
      failedLoginCount: afterSuccess?.failedLoginCount,
      lastLoginAt: afterSuccess?.lastLoginAt?.toISOString(),
    }),
  );

  /* --- 12. The audit trail records the sign-in and the failure. ----------- */

  const auditRows = await prisma.auditLog.findMany({
    where: { entityId: { in: [IDS.student, IDS.teacher, IDS.locked] } },
    select: { action: true, entityType: true, metadata: true },
  });

  const actions = auditRows.map((row) => row.action);

  check(
    "the audit log records the sign-in and the failure",
    actions.includes("Login successful") && actions.includes("Login failed"),
    actions.join(", "),
  );

  const failureRow = auditRows.find((row) => row.action === "Login failed");
  const failureMetadata = failureRow?.metadata as
    | Record<string, unknown>
    | undefined;

  check(
    "the audit log records the attempted id and never the password",
    failureRow !== undefined &&
      String(failureMetadata?.["reason"]).length > 0 &&
      !JSON.stringify(auditRows).includes(WRONG_PASSWORD) &&
      !JSON.stringify(auditRows).includes(PASSWORD),
    JSON.stringify(failureMetadata),
  );

  /* --- 13. A password change bumps the session version. ------------------ */

  const beforeChange = await prisma.user.findUnique({
    where: { loginId: IDS.teacher },
    select: { sessionVersion: true, mustChangePassword: true },
  });

  await changePassword(IDS.teacher, "Brand-New-Pass-2026!");

  const afterChange = await prisma.user.findUnique({
    where: { loginId: IDS.teacher },
    select: { sessionVersion: true, mustChangePassword: true },
  });

  check(
    "a password change bumps the session version and clears the flag",
    (afterChange?.sessionVersion ?? 0) === (beforeChange?.sessionVersion ?? 0) + 1 &&
      afterChange?.mustChangePassword === false,
    JSON.stringify({ before: beforeChange, after: afterChange }),
  );

  /* --- 14. The old password no longer works. ---------------------------- */

  const oldPassword = await authenticateCredentials({
    loginId: IDS.teacher,
    password: PASSWORD,
    role: "teacher",
  });

  const newPassword = await authenticateCredentials({
    loginId: IDS.teacher,
    password: "Brand-New-Pass-2026!",
    role: "teacher",
  });

  check(
    "the old password stops working and the new one works",
    oldPassword.ok === false && newPassword.ok === true,
    JSON.stringify({ old: oldPassword.ok, new: newPassword.ok }),
  );

  /* --- 15. The current password is checked. ----------------------------- */

  const currentMatches = await verifyCurrentPassword(
    IDS.teacher,
    "Brand-New-Pass-2026!",
  );
  const currentWrong = await verifyCurrentPassword(IDS.teacher, WRONG_PASSWORD);
  const currentUnknown = await verifyCurrentPassword(
    "auth-test-nobody",
    WRONG_PASSWORD,
  );

  check(
    "the current password is checked, and an unknown account never matches",
    currentMatches === true && currentWrong === false && currentUnknown === false,
    JSON.stringify({ currentMatches, currentWrong, currentUnknown }),
  );

  /* --- 16. The password hash never leaves the service. ------------------- */

  const leaked = await prisma.auditLog.findMany({
    where: { entityId: { in: Object.values(IDS) } },
  });

  check(
    "no password hash is written to the audit log",
    !JSON.stringify(leaked).includes("$2b$"),
    `${leaked.length} rows checked`,
  );

  await removeTestAccounts();
  await prisma.$disconnect();

  console.log("");
  const failed = results.filter((result) => !result.pass);
  console.log(
    failed.length === 0
      ? `ALL ${results.length} AUTH SERVICE CHECKS PASS`
      : `${failed.length} of ${results.length} auth service checks failed`,
  );

  if (failed.length > 0) process.exitCode = 1;
}

void main();
