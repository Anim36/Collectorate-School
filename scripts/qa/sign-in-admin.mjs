/**
 * Signs the debug browser in as the QA admin, and reports what happened.
 *
 * The admin pages are behind the sign-in, so the Figma compare scripts and the
 * browser checks need an admin session before they can measure a page.
 *
 * The sign-in goes through the Auth.js callback endpoint with the CSRF token
 * the server issues, which is the same path the check-admin-roles suite uses.
 *
 * Usage: node scripts/qa/sign-in-admin.mjs
 */

const BASE_URL = process.argv[2] ?? "http://localhost:3111";
const LOGIN_ID = process.env.QA_ADMIN_LOGIN ?? "qa-admin";
const PASSWORD = process.env.QA_ADMIN_PASSWORD ?? "Qa-Admin-Pass-2026!";

const endpoint = await (await fetch("http://localhost:9222/json")).json();
const page = endpoint.find((target) => target.type === "page");

if (!page) {
  console.log("NO PAGE TARGET");
  process.exit(1);
}

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

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Network.clearBrowserCookies");

// The page is opened on the origin, so the cookie that is set is kept.
await send("Page.navigate", { url: `${BASE_URL}/admin/login` });
await new Promise((resolve) => setTimeout(resolve, 2500));

const result = await send("Runtime.evaluate", {
  expression: `(async () => {
    const csrfResponse = await fetch('/api/auth/csrf', { credentials: 'include' });
    const csrf = await csrfResponse.json();

    const body = new URLSearchParams({
      csrfToken: csrf.csrfToken,
      loginId: ${JSON.stringify(LOGIN_ID)},
      password: ${JSON.stringify(PASSWORD)},
      role: 'ADMIN',
      callbackUrl: ${JSON.stringify(`${BASE_URL}/admin/dashboard`)},
      json: 'true',
    });

    const response = await fetch('/api/auth/callback/credentials', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const session = await fetch('/api/auth/session', { credentials: 'include' })
      .then((r) => r.text());

    return JSON.stringify({
      status: response.status,
      url: response.url,
      signedIn: session.includes('"user"'),
      session: session.slice(0, 160),
    });
  })()`,
  returnByValue: true,
  awaitPromise: true,
});

console.log(result?.result?.value ?? JSON.stringify(result));

ws.close();
