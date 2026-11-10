import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Puts a QA student and a QA teacher in place.
 *
 * The portal pages are behind the sign-in, so the Figma comparison of a portal
 * page only measures the right page when the debug browser holds a session of
 * the right role. The admin account has its own script
 * (`scripts/qa/qa-admin-account.ts`); this one covers the other two roles.
 *
 * The accounts carry the `qa-` prefix, so they are easy to find and to remove.
 *
 * Usage: npx tsx scripts/qa/qa-portal-accounts.ts
 */

/** The ids of the accounts the comparisons sign in with. */
const ACCOUNTS = [
  {
    loginId: process.env.QA_STUDENT_LOGIN ?? "qa-student",
    role: "STUDENT" as const,
  },
  {
    loginId: process.env.QA_TEACHER_LOGIN ?? "qa-student-teacher",
    role: "TEACHER" as const,
  },
];

/** The password every one of them gets. */
const PASSWORD = process.env.QA_PORTAL_PASSWORD ?? "Qa-Student-Pass-2026!";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  for (const account of ACCOUNTS) {
    await prisma.user.upsert({
      where: { loginIdNormalized: account.loginId.toLowerCase() },
      update: {
        passwordHash,
        role: account.role,
        isActive: true,
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
      create: {
        loginId: account.loginId,
        loginIdNormalized: account.loginId.toLowerCase(),
        name: `QA ${account.role}`,
        email: `${account.loginId}@example.com`,
        passwordHash,
        role: account.role,
        isActive: true,
        mustChangePassword: false,
      },
    });
  }

  console.log(
    `The QA accounts are ready: ${ACCOUNTS.map((a) => a.loginId).join(", ")}`,
  );

  await prisma.$disconnect();
}

void main();
