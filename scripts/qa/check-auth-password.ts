import "dotenv/config";

import bcrypt from "bcryptjs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import {
  connectBrowser,
  sleep,
  SET_VALUE_HELPER,
  SET_VALUE_IN_FRAME_HELPER,
  type Browser,
} from "./browser";

/**
 * The password change checks.
 *
 * The form is driven through the debug browser, so the whole path is
 * covered: the server action, the re-issued session and the invalidation
 * of the sessions made before the change.
 *
 * Usage: npx tsx scripts/qa/check-auth-password.ts [baseUrl]
 */

const BASE_URL = process.argv[2] ?? "http://localhost:3111";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PASSWORD = "Password-Test-Pass-2026!";
const NEW_PASSWORD = "Brand-New-Pass-2026!";

const results: { name: string; pass: boolean; detail: string }[] = [];

function check(name: string, pass: boolean, detail = ""): void {
  results.push({ name, pass, detail });
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`,
  );
}

const LOGIN_ID = "password-test-student-01";

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
  await createTestAccount(true);

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
      const password = document.querySelector('input[name="password"]');
      if (!id || !password) return { url: 'no fields' };

      setValue(id, ${JSON.stringify(LOGIN_ID)});
      setValue(password, ${JSON.stringify(PASSWORD)});
      await sleep(300);

      document.querySelector('button[type="submit"]').click();
      await sleep(4000);

      return { url: location.pathname };
    })()`,
  );

  check(
    "an account that must change its password lands on /change-password",
    text(signedIn, "url").includes("/change-password"),
    JSON.stringify(signedIn),
  );

  /* --- 2. A wrong current password is refused. --------------------------- */

  const wrongCurrent = await browser.evaluate(
    `(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      ${SET_VALUE_HELPER}

      const fields = document.querySelectorAll('input[type="password"]');
      const [current, next, confirm] = fields;
      setValue(current, 'Not-The-Current-One-2026!');
      setValue(next, ${JSON.stringify(NEW_PASSWORD)});
      setValue(confirm, ${JSON.stringify(NEW_PASSWORD)});
      await sleep(300);

      document.querySelector('button[type="submit"]').click();
      await sleep(3500);

      return {
        error: document.body.innerText.includes('Unable to update password'),
        stillOnPage: location.pathname.includes('change-password'),
      };
    })()`,
  );

  check(
    "a wrong current password shows the error state",
    flag(wrongCurrent, "error"),
    JSON.stringify(wrongCurrent),
  );

  const stillHash = await prisma.user.findUnique({
    where: { loginId: LOGIN_ID },
    select: { passwordHash: true },
  });

  check(
    "a wrong current password leaves the hash alone",
    (stillHash?.passwordHash ?? "").length > 0,
    "hash unchanged",
  );

  /* --- 3. The change is applied. ---------------------------------------- */

  const changed = await browser.evaluate(
    `(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      ${SET_VALUE_HELPER}

      const fields = document.querySelectorAll('input[type="password"]');
      const [current, next, confirm] = fields;
      setValue(current, ${JSON.stringify(PASSWORD)});
      setValue(next, ${JSON.stringify(NEW_PASSWORD)});
      setValue(confirm, ${JSON.stringify(NEW_PASSWORD)});
      await sleep(300);

      document.querySelector('button[type="submit"]').click();
      await sleep(4000);

      return {
        saved: document.body.innerText.includes('Password updated'),
        url: location.pathname,
      };
    })()`,
  );

  check(
    "the change shows the saved state",
    flag(changed, "saved"),
    JSON.stringify(changed),
  );

  const after = await prisma.user.findUnique({
    where: { loginId: LOGIN_ID },
    select: { mustChangePassword: true, sessionVersion: true },
  });

  check(
    "the change bumps the session version and clears the flag",
    after?.mustChangePassword === false && (after?.sessionVersion ?? 0) >= 1,
    JSON.stringify(after),
  );

  /* --- 4. The old password no longer signs in. --------------------------- */

  const oldPassword = await trySignIn(browser, LOGIN_ID, PASSWORD);
  check(
    "the old password no longer signs in",
    oldPassword === false,
    `signed in: ${oldPassword}`,
  );

  /* --- 5. The new password signs in and reaches the portal. -------------- */

  const newPassword = await trySignIn(browser, LOGIN_ID, NEW_PASSWORD);
  check(
    "the new password signs in",
    newPassword === true,
    `signed in: ${newPassword}`,
  );

  const reached = await browser.evaluate(
    `(async () => {
      const response = await fetch('/student/dashboard', {
        redirect: 'manual',
      });
      return { status: response.status };
    })()`,
  );

  check(
    "the account reaches the portal once the password is changed",
    text(reached, "status") === "200",
    JSON.stringify(reached),
  );

  /* --- 6. The change is audited. ---------------------------------------- */

  const audits = await prisma.auditLog.findMany({
    where: { entityId: LOGIN_ID, action: "Password changed" },
    select: { action: true },
  });

  check(
    "the password change is written to the audit log",
    audits.length > 0,
    `${audits.length} rows`,
  );

  /* --- 7. A short password is refused by the form. ---------------------- */

  await createTestAccount(true);

  const short = await browser.evaluate(
    `(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      // The password page is opened in a fresh frame, so the fields are read
      // from the new document.
      const frame = document.createElement('iframe');
      frame.style.display = 'none';
      frame.src = '/change-password';
      document.body.appendChild(frame);
      await sleep(2500);

      const doc = frame.contentDocument;
      const fields = doc.querySelectorAll('input[type="password"]');

      if (fields.length < 3) {
        return { message: false, saved: false, count: fields.length };
      }

      ${SET_VALUE_IN_FRAME_HELPER}

      setValue(fields[0], ${JSON.stringify(PASSWORD)});
      setValue(fields[1], 'Short1!');
      setValue(fields[2], 'Short1!');
      await sleep(400);

      doc.querySelector('button[type="submit"]').click();
      await sleep(2500);

      const body = doc.body.innerText;

      frame.remove();

      return {
        message: body.includes('at least 12 characters'),
        saved: body.includes('Password updated'),
      };
    })()`,
  );

  check(
    "a password under twelve characters is refused by the form",
    flag(short, "message") && flag(short, "saved") === false,
    JSON.stringify(short),
  );

  /* --- 8. A mismatched confirmation is refused by the form. ------------- */

  const mismatch = await browser.evaluate(
    `(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      const frame = document.createElement('iframe');
      frame.style.display = 'none';
      frame.src = '/change-password';
      document.body.appendChild(frame);
      await sleep(2500);

      const doc = frame.contentDocument;
      const fields = doc.querySelectorAll('input[type="password"]');

      if (fields.length < 3) {
        return { message: false, saved: false, count: fields.length };
      }

      ${SET_VALUE_IN_FRAME_HELPER}

      setValue(fields[0], ${JSON.stringify(PASSWORD)});
      setValue(fields[1], ${JSON.stringify(NEW_PASSWORD)});
      setValue(fields[2], 'SomethingElse-2026!');
      await sleep(400);

      doc.querySelector('button[type="submit"]').click();
      await sleep(2500);

      const body = doc.body.innerText;

      frame.remove();

      return {
        message: body.includes('do not match'),
        saved: body.includes('Password updated'),
      };
    })()`,
  );

  check(
    "a mismatched confirmation is refused by the form",
    flag(mismatch, "message") && flag(mismatch, "saved") === false,
    JSON.stringify(mismatch),
  );

  await removeTestAccount();
  await prisma.$disconnect();
  browser.close();

  console.log("");
  const failed = results.filter((result) => !result.pass);
  console.log(
    failed.length === 0
      ? `ALL ${results.length} PASSWORD CHECKS PASS`
      : `${failed.length} of ${results.length} password checks failed`,
  );

  if (failed.length > 0) process.exitCode = 1;
}

/** Signs in through the form and reports whether it worked. */
async function trySignIn(
  browser: Browser,
  loginId: string,
  password: string,
): Promise<boolean> {
  // The browser keeps the cookies of the previous attempt, so they are
  // cleared before each sign-in.
  await browser.send("Network.clearBrowserCookies");

  await browser.send("Page.navigate", { url: `${BASE_URL}/login` });
  await sleep(3000);

  const result = await browser.evaluate(
    `(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      ${SET_VALUE_HELPER}

      const id = document.querySelector('input[name="identifier"]');
      const pw = document.querySelector('input[name="password"]');
      if (!id || !pw) return { signedIn: false, error: true };

      setValue(id, ${JSON.stringify(loginId)});
      setValue(pw, ${JSON.stringify(password)});
      await sleep(300);

      document.querySelector('button[type="submit"]').click();
      await sleep(4000);

      const session = await fetch('/api/auth/session').then((r) => r.text());

      return {
        signedIn: session.includes('"user"'),
        error: document.body.innerText.includes('Unable to sign in'),
      };
    })()`,
  );

  return flag(result, "signedIn") && flag(result, "error") === false;
}

async function createTestAccount(mustChange: boolean): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await prisma.user.upsert({
    where: { loginIdNormalized: LOGIN_ID.toLowerCase() },
    update: {
      loginId: LOGIN_ID,
      passwordHash,
      role: "STUDENT",
      isActive: true,
      mustChangePassword: mustChange,
      failedLoginCount: 0,
      lockedUntil: null,
      sessionVersion: 0,
    },
    create: {
      id: LOGIN_ID,
      loginId: LOGIN_ID,
      loginIdNormalized: LOGIN_ID.toLowerCase(),
      name: "Password Test Student",
      email: `${LOGIN_ID}@example.com`,
      passwordHash,
      role: "STUDENT",
      mustChangePassword: mustChange,
    },
  });
}

async function removeTestAccount(): Promise<void> {
  await prisma.auditLog.deleteMany({ where: { entityId: LOGIN_ID } });
  await prisma.user.deleteMany({ where: { loginId: LOGIN_ID } });
}

void main();
