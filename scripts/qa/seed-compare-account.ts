import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { deleteQaAuditRows } from "./audit-cleanup";

/**
 * Puts an account in place for the change-password page, which only renders
 * for a user who has to replace their password.
 *
 * The page cannot be measured otherwise: without a session the middleware
 * sends the visitor to the sign-in page, so the comparison would be made
 * against the wrong layout.
 *
 * Usage:
 *   npx tsx scripts/qa/seed-compare-account.ts          put the account in place
 *   npx tsx scripts/qa/seed-compare-account.ts --clean  take the account away
 */

const LOGIN_ID = "figma-compare-student-01";
const PASSWORD = "Figma-Compare-Pass-2026!";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main(): Promise<void> {
  const clean = process.argv.includes("--clean");

  if (clean) {
    await deleteQaAuditRows(prisma, { entityIds: [LOGIN_ID] });
    await prisma.user.deleteMany({ where: { loginId: LOGIN_ID } });

    console.log("account removed:", LOGIN_ID);
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await prisma.user.upsert({
    where: { loginIdNormalized: LOGIN_ID.toLowerCase() },
    update: {
      loginId: LOGIN_ID,
      passwordHash,
      role: "STUDENT",
      isActive: true,
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
      sessionVersion: 0,
    },
    create: {
      id: LOGIN_ID,
      loginId: LOGIN_ID,
      loginIdNormalized: LOGIN_ID.toLowerCase(),
      name: "Figma Compare",
      email: `${LOGIN_ID}@example.com`,
      passwordHash,
      role: "STUDENT",
      mustChangePassword: true,
    },
  });

  console.log("account ready:", LOGIN_ID);
  await prisma.$disconnect();
}

void main();
