/**
 * Reports the geometry of a table on a route: the column widths and the row
 * heights, so a table that grows past the Figma rhythm can be traced.
 *
 * Usage: node scripts/qa/measure-table.mjs <route> <width> [tableIndex]
 */
const route = process.argv[2] ?? "/admin/fees";
const width = Number(process.argv[3] ?? 768);
const tableIndex = Number(process.argv[4] ?? 0);

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

console.log(`=== ${route} @ ${width}px ===\n`);

console.log(
  JSON.stringify(
    await evaluate(`(() => {
      const tables = [...document.querySelectorAll("table")];
      const table = tables[${tableIndex}];
      if (!table) return "no table";

      const header = [...table.querySelectorAll("thead th")].map((th) => {
        const r = th.getBoundingClientRect();
        return {
          head: th.textContent.trim(),
          w: Math.round(r.width),
          h: Math.round(r.height),
          lines: Math.round(r.height / 20),
        };
      });

      const rows = [...table.querySelectorAll("tbody tr")].map((tr) => {
        const r = tr.getBoundingClientRect();
        return {
          h: Math.round(r.height),
          cells: [...tr.children].map((td) => {
            const cell = td.getBoundingClientRect();
            return {
              text: td.textContent.trim().slice(0, 22),
              w: Math.round(cell.width),
              h: Math.round(cell.height),
            };
          }),
        };
      });

      const box = table.parentElement.getBoundingClientRect();
      return { header, rows, tableHeight: Math.round(box.height) };
    })()`),
    null,
    1,
  ),
);

ws.close();
