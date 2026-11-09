import "dotenv/config";

import bcrypt from "bcryptjs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * The admin account the browser checks sign in as.
 *
 * The admin pages are behind the sign-in, so the Figma compare scripts and the
 * browser checks need an admin session before they can measure a page. This
 * script makes sure the account exists, with a password that is known and an
 * account that does not have to change it.
 *
 * The account carries the `qa-admin` prefix, so it is easy to find and to
 * remove.
 *
 * Usage: npx tsx scripts/qa/qa-admin-account.ts
 */

const LOGIN_ID = process.env.QA_ADMIN_LOGIN ?? "qa-admin";
const PASSWORD = process.env.QA_ADMIN_PASSWORD ?? "Qa-Admin-Pass-2026!";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await prisma.user.upsert({
    where: { loginIdNormalized: LOGIN_ID.toLowerCase() },
    update: {
      passwordHash,
      role: "ADMIN",
      isActive: true,
      mustChangePassword: false,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      loginId: LOGIN_ID,
      loginIdNormalized: LOGIN_ID.toLowerCase(),
      name: "QA Admin",
      email: `${LOGIN_ID}@example.com`,
      passwordHash,
      role: "ADMIN",
      isActive: true,
      mustChangePassword: false,
    },
  });

  console.log(`The QA admin account is ready: ${LOGIN_ID}`);

  await prisma.$disconnect();
}

void main();
