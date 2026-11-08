/**
 * Prints the buttons of a route, so a control that cannot be found can be
 * traced.
 *
 * Usage: node scripts/qa/dump-buttons.mjs <route> [width]
 */
const route = process.argv[2] ?? "/admin/fees";
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
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
});

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) return { error: result.exceptionDetails.text };
  return result.result.value;
}

await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2800));

console.log(
  JSON.stringify(
    await evaluate(`(() => {
      const buttons = [...document.querySelectorAll("button")].map((b) => ({
        text: b.textContent.trim().slice(0, 40),
        inTable: Boolean(b.closest("table")),
        visible: b.offsetParent !== null,
      }));
      const rows = [...document.querySelectorAll("table tbody tr")].map((tr) =>
        tr.textContent.trim().slice(0, 70),
      );
      return { buttons, rows };
    })()`),
    null,
    1,
  ),
);

ws.close();
