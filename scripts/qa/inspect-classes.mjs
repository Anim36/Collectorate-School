/**
 * Prints the class list of the first body-row cells.
 *
 * Usage: node scripts/qa/inspect-classes.mjs <route> <width> <selector>
 */
const route = process.argv[2] ?? "/notice";
const width = Number(process.argv[3] ?? 1440);
const height = Number(process.argv[4] ?? 1200);
const selector = process.argv[5] ?? "table";

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
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const root = document.querySelector(${JSON.stringify(selector)});
  if (!root) return null;
  const cells = Array.from(root.querySelectorAll("tbody tr:first-child td")).map((td) => ({
    className: td.className,
    borderTopWidth: getComputedStyle(td).borderTopWidth,
  }));
  const head = Array.from(root.querySelectorAll("thead th")).map((th) => th.className);
  return { cells, head };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log(JSON.stringify(result.result.value, null, 2));

ws.close();
