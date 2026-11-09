/**
 * Prints the URL and the headings and the first table of a route, so a check
 * can tell which page it is really looking at.
 *
 * Usage: node scripts/qa/inspect-page.mjs /admin/notices 1440
 */

const route = process.argv[2] ?? "/admin/notices";
const width = Number(process.argv[3] ?? 1440);

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
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2600));

const expression = `(() => {
  const table = document.querySelector("table");
  const inputs = Array.from(document.querySelectorAll("input")).map((el) => ({
    type: el.type,
    value: el.value.slice(0, 30),
  }));
  const textareas = Array.from(document.querySelectorAll("textarea")).map((el) => ({
    value: el.value.slice(0, 30),
  }));
  const buttons = Array.from(document.querySelectorAll("button"))
    .map((b) => b.textContent.trim())
    .filter(Boolean)
    .slice(0, 30);
  return {
    url: location.pathname,
    headings: Array.from(document.querySelectorAll("h1, h2, h3"))
      .map((h) => h.textContent.trim().replace(/\\s+/g, " ").slice(0, 40))
      .slice(0, 12),
    tableRows: table
      ? [...table.querySelectorAll("tbody tr")].slice(0, 3).map((tr) =>
          [...tr.children].map((td) => td.textContent.trim().replace(/\\s+/g, " ")).join(" | "),
        )
      : null,
    inputs,
    textareas,
    buttons,
  };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log(JSON.stringify(result.result.value, null, 1));

ws.close();
