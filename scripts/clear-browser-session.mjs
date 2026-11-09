/**
 * Clears the cookies of the debug browser.
 *
 * The comparison script measures a public page, so the browser has to be
 * signed out before it is run.
 */

const endpoint = await (await fetch("http://localhost:9222/json")).json();
const page = endpoint.find((t) => t.type === "page");

if (!page) {
  console.log("NO PAGE TARGET");
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);

  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
});

await new Promise((resolve) => ws.addEventListener("open", resolve));
await send("Network.enable");
await send("Network.clearBrowserCookies");

console.log("cookies cleared");

ws.close();
