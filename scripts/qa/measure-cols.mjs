/**
 * Reports the computed width of every column of a table on a route.
 *
 * Usage: node scripts/qa/measure-cols.mjs <route> <width> [tableIndex]
 */
const route = process.argv[2] ?? "/admin/fees";
const width = Number(process.argv[3] ?? 768);
const tableIndex = Number(process.argv[4] ?? 1);

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
await new Promise((resolve) => setTimeout(resolve, 2600));

console.log(
  JSON.stringify(
    await evaluate(`(() => {
      const table = [...document.querySelectorAll("table")][${tableIndex}];
      if (!table) return "no table";

      const cols = [...table.querySelectorAll("colgroup col")].map((col) => ({
        inline: col.getAttribute("style"),
        computed: getComputedStyle(col).width,
      }));

      const heads = [...table.querySelectorAll("thead th")].map((th) => {
        const r = th.getBoundingClientRect();
        const style = getComputedStyle(th);
        return {
          head: th.textContent.trim(),
          w: Math.round(r.width),
          padLeft: style.paddingLeft,
          padRight: style.paddingRight,
          scrollW: th.scrollWidth,
        };
      });

      return { layout: getComputedStyle(table).tableLayout, cols, heads };
    })()`),
    null,
    1,
  ),
);

ws.close();
