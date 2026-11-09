/**
 * Prints what the admin sign-in page looks like in the debug browser.
 *
 * It is a helper for the sign-in script, so a failure can be told apart from
 * a wrong password.
 *
 * Usage: node scripts/qa/inspect-admin-login.mjs
 */

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

await send("Page.navigate", { url: "http://localhost:3111/admin/login" });
await new Promise((resolve) => setTimeout(resolve, 3000));

const result = await send("Runtime.evaluate", {
  expression: `JSON.stringify({
    url: location.href,
    title: document.title,
    hasIdentifier: Boolean(document.querySelector('[data-auth="identifier"]')),
    hasPassword: Boolean(document.querySelector('[data-auth="password"] input')),
    inputs: Array.from(document.querySelectorAll('input')).map((input) => ({
      type: input.type,
      name: input.name,
      auth: input.getAttribute('data-auth'),
    })),
    buttons: Array.from(document.querySelectorAll('button')).map((button) =>
      button.textContent.trim(),
    ),
  })`,
  returnByValue: true,
});

console.log(result?.result?.value ?? JSON.stringify(result));

ws.close();
