import "dotenv/config";

import bcrypt from "bcryptjs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import {
  connectBrowser,
  sleep,
  SET_VALUE_HELPER,
} from "./browser";

/**
 * The sign-out checks.
 *
 * They drive the sign-out control in the portal shell through the debug
 * browser, so the button, the server action and the audit row are all
 * covered.
 *
 * Usage: npx tsx scripts/qa/check-auth-logout.ts [baseUrl]
 */

const BASE_URL = process.argv[2] ?? "http://localhost:3111";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PASSWORD = "Logout-Test-Pass-2026!";
const LOGIN_ID = "logout-test-student-01";

const results: { name: string; pass: boolean; detail: string }[] = [];

function check(name: string, pass: boolean, detail = ""): void {
  results.push({ name, pass, detail });
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`,
  );
}

/** Reads a string field out of a page result. */
function text(result: { value?: unknown; error?: string }, key: string): string {
  if (result.value && typeof result.value === "object" && key in result.value) {
    return String((result.value as Record<string, unknown>)[key]);
  }

  return "";
}

/** Reads a boolean field out of a page result. */
function flag(result: { value?: unknown; error?: string }, key: string): boolean {
  if (result.value && typeof result.value === "object" && key in result.value) {
    return Boolean((result.value as Record<string, unknown>)[key]);
  }

  return false;
}

async function main(): Promise<void> {
  await createTestAccount();

  const browser = await connectBrowser();

  await browser.send("Page.enable");
  await browser.send("Runtime.enable");
  await browser.send("Network.enable");
  await browser.send("Network.clearBrowserCookies");
  await browser.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  /* --- 1. Sign in through the form. ------------------------------------- */

  await browser.send("Page.navigate", { url: `${BASE_URL}/login` });
  await sleep(3000);

  const signedIn = await browser.evaluate(
    `(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      ${SET_VALUE_HELPER}

      const id = document.querySelector('input[name="identifier"]');
      const pw = document.querySelector('input[name="password"]');
      if (!id || !pw) return { url: 'no fields' };

      setValue(id, ${JSON.stringify(LOGIN_ID)});
      setValue(pw, ${JSON.stringify(PASSWORD)});
      await sleep(300);

      document.querySelector('button[type="submit"]').click();
      await sleep(4000);

      return { url: location.pathname };
    })()`,
  );

  check(
    "the student signs in and reaches the portal",
    text(signedIn, "url").includes("/student"),
    JSON.stringify(signedIn),
  );

  /* --- 2. The shell shows the name from the database. -------------------- */

  const shell = await browser.evaluate(
    `(() => ({
      name: document.body.innerText.includes('Logout Test Student'),
      hasLogout: Boolean(document.querySelector('[data-portal="logout"]')),
    }))()`,
  );

  check(
    "the top bar shows the name from the database",
    flag(shell, "name"),
    JSON.stringify(shell),
  );

  check(
    "the sidebar carries the sign-out control",
    flag(shell, "hasLogout"),
    JSON.stringify(shell),
  );

  /* --- 3. The sign-out control ends the session. ------------------------- */

  const signedOut = await browser.evaluate(
    `(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      const button = document.querySelector('[data-portal="logout"]');
      if (!button) return { url: 'no logout button', signedIn: false };

      button.click();
      await sleep(4000);

      const session = await fetch('/api/auth/session').then((r) => r.text());

      return {
        url: location.pathname,
        signedIn: session.includes('"user"'),
      };
    })()`,
  );

  check(
    "the sign-out control sends the user to the sign-in page",
    text(signedOut, "url") === "/login",
    JSON.stringify(signedOut),
  );

  check(
    "the session is gone after signing out",
    flag(signedOut, "signedIn") === false,
    JSON.stringify(signedOut),
  );

  /* --- 4. The sign-out is audited. -------------------------------------- */

  const audits = await prisma.auditLog.findMany({
    where: { entityId: LOGIN_ID, action: "Signed out" },
    select: { action: true },
  });

  check(
    "the sign-out is written to the audit log",
    audits.length > 0,
    `${audits.length} rows`,
  );

  await removeTestAccount();
  await prisma.$disconnect();
  browser.close();

  console.log("");
  const failed = results.filter((result) => !result.pass);
  console.log(
    failed.length === 0
      ? `ALL ${results.length} SIGN-OUT CHECKS PASS`
      : `${failed.length} of ${results.length} sign-out checks failed`,
  );

  if (failed.length > 0) process.exitCode = 1;
}

async function createTestAccount(): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await prisma.user.upsert({
    where: { loginIdNormalized: LOGIN_ID.toLowerCase() },
    update: {
      loginId: LOGIN_ID,
      passwordHash,
      role: "STUDENT",
      isActive: true,
      failedLoginCount: 0,
      lockedUntil: null,
      sessionVersion: 0,
    },
    create: {
      id: LOGIN_ID,
      loginId: LOGIN_ID,
      loginIdNormalized: LOGIN_ID.toLowerCase(),
      name: "Logout Test Student",
      email: `${LOGIN_ID}@example.com`,
      passwordHash,
      role: "STUDENT",
    },
  });

  // The flag is set after the upsert, so a seed run in between cannot
  // leave the account held at the password page.
  await prisma.user.update({
    where: { loginId: LOGIN_ID },
    data: { mustChangePassword: false },
  });
}

async function removeTestAccount(): Promise<void> {
  await prisma.auditLog.deleteMany({ where: { entityId: LOGIN_ID } });
  await prisma.user.deleteMany({ where: { loginId: LOGIN_ID } });
}

void main();
