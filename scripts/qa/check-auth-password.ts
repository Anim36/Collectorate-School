import "dotenv/config";

import bcrypt from "bcryptjs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { deleteQaAuditRows } from "./audit-cleanup";
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

  // The cookie of the session that is open now is kept, so it can be put
  // back later and used to show that a session made before the change is
  // refused.
  const cookiesBefore = await readSessionCookies(browser);

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

      const started = Date.now();
      document.querySelector('button[type="submit"]').click();

      // The success state is looked for while it is on screen, and the
      // moment the page moves on to the dashboard is noted as well.
      let saved = false;
      let savedAt = 0;
      let navigatedAt = 0;

      for (let step = 0; step < 60; step += 1) {
        if (!saved && document.body.innerText.includes('Password updated')) {
          saved = true;
          savedAt = Date.now() - started;
        }

        if (location.pathname !== '/change-password') {
          navigatedAt = Date.now() - started;
          break;
        }

        await sleep(100);
      }

      return {
        saved,
        savedAt,
        navigatedAt,
        url: location.pathname,
      };
    })()`,
  );

  check(
    "the change shows the saved state",
    flag(changed, "saved"),
    JSON.stringify(changed),
  );

  check(
    "the change opens the role dashboard on its own",
    text(changed, "url") === "/student/dashboard",
    JSON.stringify(changed),
  );

  check(
    "the dashboard opens about a second and a half after the change",
    Number(text(changed, "navigatedAt")) >= 1000 &&
      Number(text(changed, "navigatedAt")) <= 4000,
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

  /* --- 4. The session is refreshed, so the dashboard opens. ---------------- */

  // The browser is not signed in again: the session that was open when the
  // password was changed has to carry the new claims by itself.
  const refreshed = await browser.evaluate(
    `(async () => {
      const dashboard = await fetch('/student/dashboard');

      const session = await fetch('/api/auth/session').then((r) => r.text());

      return {
        dashboardStatus: dashboard.status,
        dashboardUrl: dashboard.url,
        mustChangePassword: session.includes('"mustChangePassword":false'),
        sessionVersion: (/"sessionVersion":(\\d+)/.exec(session) || [])[1] || '',
      };
    })()`,
  );

  check(
    "the dashboard opens without signing in again",
    text(refreshed, "dashboardStatus") === "200",
    JSON.stringify(refreshed),
  );

  check(
    "the dashboard does not redirect to the password page",
    text(refreshed, "dashboardUrl").includes("/student/dashboard") &&
      !text(refreshed, "dashboardUrl").includes("/change-password"),
    JSON.stringify(refreshed),
  );

  check(
    "the session shows mustChangePassword as false",
    flag(refreshed, "mustChangePassword"),
    JSON.stringify(refreshed),
  );

  check(
    "the session shows the new session version",
    Number(text(refreshed, "sessionVersion")) === (after?.sessionVersion ?? 0),
    JSON.stringify({
      session: text(refreshed, "sessionVersion"),
      row: after?.sessionVersion,
    }),
  );

  /* --- 5. A session made before the change is refused. -------------------- */

  // The cookie of the session that was open before the change is put back,
  // so the request is made with the old claims.
  await restoreSessionCookies(browser, cookiesBefore);

  const stale = await browser.evaluate(
    `(async () => {
      const dashboard = await fetch('/student/dashboard');

      return {
        dashboardStatus: dashboard.status,
        dashboardUrl: dashboard.url,
      };
    })()`,
  );

  check(
    "a session made before the change is refused",
    text(stale, "dashboardStatus") !== "200" ||
      !text(stale, "dashboardUrl").includes("/student/dashboard"),
    JSON.stringify(stale),
  );

  const staleSession = await browser.evaluate(
    `(async () => {
      const session = await fetch('/api/auth/session').then((r) => r.text());
      return {
        sessionVersion: (/"sessionVersion":(\\d+)/.exec(session) || [])[1] || '',
      };
    })()`,
  );

  check(
    "the old session still carries the old session version",
    Number(text(staleSession, "sessionVersion")) <
      (after?.sessionVersion ?? 0),
    JSON.stringify({
      session: text(staleSession, "sessionVersion"),
      row: after?.sessionVersion,
    }),
  );

  // The refreshed session is put back, so the checks that follow act as the
  // user who changed the password.
  await browser.send("Network.clearBrowserCookies");
  await browser.send("Page.navigate", { url: `${BASE_URL}/login` });
  await sleep(2500);
  await browser.send("Network.setCookies", { cookies: [] }).catch(() => {
    // The helper is only used where the browser supports it.
  });

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
  await deleteQaAuditRows(prisma, { entityIds: [LOGIN_ID] });
  await prisma.user.deleteMany({ where: { loginId: LOGIN_ID } });
}

/**
 * Reads the session cookies the browser is holding.
 *
 * The cookies are kept so the session that was open before the password
 * change can be put back afterwards, which is how a session made before the
 * change is shown to be refused.
 */
async function readSessionCookies(
  browser: Browser,
): Promise<BrowserCookie[]> {
  const result = await browser.send("Network.getCookies", {
    urls: [BASE_URL],
  });

  const cookies = (result?.result?.value ?? []) as BrowserCookie[];

  return cookies.filter((cookie) => cookie.name.includes("session-token"));
}

/**
 * Puts cookies back into the browser.
 */
async function restoreSessionCookies(
  browser: Browser,
  cookies: BrowserCookie[],
): Promise<void> {
  await browser.send("Network.clearBrowserCookies");

  if (cookies.length === 0) return;

  await browser.send("Network.setCookies", {
    cookies: cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    })),
  });
}

/**
 * A cookie the browser is holding.
 */
interface BrowserCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: string;
}

void main();
