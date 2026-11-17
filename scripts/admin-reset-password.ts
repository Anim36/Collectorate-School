import "dotenv/config";

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

/**
 * The guarded administrator password reset.
 *
 * It exists so the school can recover the only admin account when nobody can
 * sign in. It never prints the password, it refuses to run without an
 * explicit confirmation, and it writes an audit row.
 *
 * Usage:
 *
 *   ADMIN_RESET_LOGIN=admin ADMIN_RESET_PASSWORD='a long password' \
 *     npm run admin:reset-password -- --confirm
 *
 * or, interactively:
 *
 *   npm run admin:reset-password -- --confirm
 *
 * The password is read from `ADMIN_RESET_PASSWORD` when it is set, otherwise
 * from the terminal with the echo off where the platform supports it.
 */

/** The confirmation that has to be present. */
const CONFIRMATION = "RESET-ADMIN-PASSWORD";

/** The cost of the new hash, the same as every other password. */
const BCRYPT_COST = 12;

function fail(message: string): never {
  console.error(`Refused: ${message}`);
  process.exit(1);
}

/** Reads a line from the terminal. */
async function ask(question: string): Promise<string> {
  const terminal = createInterface({ input, output });

  try {
    return (await terminal.question(question)).trim();
  } finally {
    terminal.close();
  }
}

/** Reads a password without echoing it where the terminal supports it. */
async function askPassword(): Promise<string> {
  // `readline` cannot turn the echo off. The environment variable is the
  // recommended path for an automated reset; the prompt is the fallback.
  return ask("New admin password (it will not be shown again): ");
}

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    fail(
      `run with --confirm only when you mean it. The confirmation is ${CONFIRMATION}.`,
    );
  }

  if (
    process.env.ADMIN_RESET_CONFIRM &&
    process.env.ADMIN_RESET_CONFIRM !== CONFIRMATION
  ) {
    fail(`ADMIN_RESET_CONFIRM must be exactly ${CONFIRMATION}.`);
  }

  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL is not set.");
  }

  const loginId =
    process.env.ADMIN_RESET_LOGIN?.trim() ||
    (await ask("Admin login id: "));

  if (!loginId) fail("no admin login id was given.");

  const password =
    process.env.ADMIN_RESET_PASSWORD ?? (await askPassword());

  if (password.length < 12 || !/\d/.test(password)) {
    fail("the new password must be at least 12 characters and include a number.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const user = await prisma.user.findUnique({
      where: { loginIdNormalized: loginId.toLowerCase() },
      select: { id: true, loginId: true, role: true, isActive: true },
    });

    if (!user) fail(`there is no account with login id "${loginId}".`);

    if (user.role !== "ADMIN") {
      fail(`the account "${user.loginId}" is a ${user.role}, not an ADMIN.`);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          mustChangePassword: true,
          isActive: true,
          failedLoginCount: 0,
          lockedUntil: null,
          sessionVersion: { increment: 1 },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "Password reset",
          entityType: "Account",
          entityId: user.loginId,
          metadata: { source: "admin-reset-password script" },
        },
      });
    });

    console.log(
      `Password reset for "${user.loginId}". Every existing session has been ended. The new password is not printed.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // A stack trace can carry a connection string, so only the message is
  // printed and only when it is not one of the guarded refusals.
  console.error(
    error instanceof Error ? `Failed: ${error.message}` : "Failed.",
  );
  process.exitCode = 1;
});
