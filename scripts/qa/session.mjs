/**
 * The session the debug browser holds.
 *
 * The portal pages are behind the sign-in, so a comparison only measures the
 * page it was written for when the browser holds a session of the right role.
 * A session of the wrong role sends the page to the dashboard of that role
 * instead, and a session at all sends the sign-in page to the dashboard, so
 * the comparison has to sign in before it measures.
 *
 * The accounts are the ones the QA scripts make:
 *
 * | Role         | Account                       | Made by                       |
 * | ------------ | ----------------------------- | ----------------------------- |
 * | `ADMIN`      | `qa-admin`                    | `scripts/qa/qa-admin-account.ts` |
 * | `STUDENT`    | `qa-student`                  | `scripts/qa/qa-portal-accounts.ts` |
 * | `TEACHER`    | `qa-student-teacher`          | `scripts/qa/qa-portal-accounts.ts` |
 * | `MUST_CHANGE`| `figma-compare-student-01`    | `scripts/qa/seed-compare-account.ts` |
 *
 * Usage: node scripts/qa/session.mjs <role>
 *   e.g. node scripts/qa/session.mjs STUDENT
 */

/** The accounts the comparisons sign in with. */
const ACCOUNTS = {
  ADMIN: {
    loginId: process.env.QA_ADMIN_LOGIN ?? "qa-admin",
    password: process.env.QA_ADMIN_PASSWORD ?? "Qa-Admin-Pass-2026!",
  },
  STUDENT: {
    loginId: process.env.QA_STUDENT_LOGIN ?? "qa-student",
    password: process.env.QA_PORTAL_PASSWORD ?? "Qa-Student-Pass-2026!",
  },
  TEACHER: {
    loginId: process.env.QA_TEACHER_LOGIN ?? "qa-student-teacher",
    password: process.env.QA_PORTAL_PASSWORD ?? "Qa-Student-Pass-2026!",
  },
  MUST_CHANGE: {
    loginId: process.env.QA_COMPARE_LOGIN ?? "figma-compare-student-01",
    password: process.env.QA_COMPARE_PASSWORD ?? "Figma-Compare-Pass-2026!",
  },
};

/** The address the app runs on. */
const BASE_URL = process.env.QA_BASE_URL ?? "http://localhost:3111";

/**
 * Opens the debug browser.
 *
 * @returns The connection and the id of the next message.
 */
async function openBrowser() {
  const endpoint = await (
    await fetch("http://localhost:9222/json")
  ).json();

  const page = endpoint.find((target) => target.type === "page");

  if (!page) throw new Error("NO PAGE TARGET");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const messageId = ++id;
      pending.set(messageId, resolve);
      ws.send(JSON.stringify({ id: messageId, method, params }));
    });
  }

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message.result);
      pending.delete(message.id);
    }
  });

  await new Promise((resolve) => ws.addEventListener("open", resolve));

  return { ws, send };
}

/**
 * Signs the browser in with the account of a role, or signs it out.
 *
 * @param role The role to sign in as, or `none` to sign out.
 * @returns The message that says what happened.
 */
export async function signInAs(role) {
  const { ws, send } = await openBrowser();

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Network.clearBrowserCookies");

  await send("Page.navigate", { url: `${BASE_URL}/login` });
  await new Promise((resolve) => setTimeout(resolve, 2200));

  if (!role || role === "none") {
    ws.close();
    return "signed out";
  }

  const account = ACCOUNTS[role];

  if (!account) {
    ws.close();
    throw new Error(`UNKNOWN ROLE ${role}`);
  }

  // The account of the change-password page is a student that still has to
  // replace its password, so the role it signs in with is the student one.
  const authRole = role === "MUST_CHANGE" ? "STUDENT" : role;

  const result = await send("Runtime.evaluate", {
    expression: `(async () => {
      const csrfResponse = await fetch('/api/auth/csrf', { credentials: 'include' });
      const csrf = await csrfResponse.json();

      const body = new URLSearchParams({
        csrfToken: csrf.csrfToken,
        loginId: ${JSON.stringify(account.loginId)},
        password: ${JSON.stringify(account.password)},
        role: ${JSON.stringify(authRole)},
        callbackUrl: ${JSON.stringify(`${BASE_URL}/`)},
        json: 'true',
      });

      await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      const session = await fetch('/api/auth/session', { credentials: 'include' })
        .then((r) => r.text());

      return session.includes('"user"') ? 'signed in' : 'NOT SIGNED IN';
    })()`,
    returnByValue: true,
    awaitPromise: true,
  });

  ws.close();

  return `${role}: ${result.result.value}`;
}

/* When the script is run on its own, it signs in and prints what happened. */

const isRunOnItsOwn = process.argv[1]?.endsWith("session.mjs");

if (isRunOnItsOwn) {
  console.log(await signInAs(process.argv[2] ?? "none"));

  // The socket of the debug browser keeps the process alive, so it is left
  // here on purpose.
  process.exit(0);
}
