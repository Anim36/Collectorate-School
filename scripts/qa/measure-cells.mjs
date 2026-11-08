/**
 * Prints the computed geometry of the cells of the first body row.
 *
 * Usage: node scripts/qa/measure-cells.mjs <route> <width> <selector>
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
  const table = root.getBoundingClientRect();
  const cells = Array.from(root.querySelectorAll("tbody tr:first-child td")).map((td) => {
    const r = td.getBoundingClientRect();
    const textNode = td.querySelector("a") || td.firstElementChild || td;
    const tr = textNode.getBoundingClientRect();
    return {
      cellWidth: Math.round(r.width * 10) / 10,
      cellHeight: Math.round(r.height * 10) / 10,
      textWidth: Math.round(tr.width * 10) / 10,
      textHeight: Math.round(tr.height * 10) / 10,
      text: (textNode.textContent || "").trim().slice(0, 26),
      fontSize: getComputedStyle(textNode).fontSize,
    };
  });
  return { tableWidth: Math.round(table.width), cells };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

const actual = result.result.value;
if (!actual) {
  console.log("NO MATCH for selector");
  process.exit(1);
}

console.log(`=== ${route} @ ${width}px :: ${selector} ===`);
console.log(`table width ${actual.tableWidth}`);
for (const cell of actual.cells) {
  console.log(
    `  cell w ${String(cell.cellWidth).padStart(6)} h ${String(cell.cellHeight).padStart(6)}` +
      `  text w ${String(cell.textWidth).padStart(6)} h ${String(cell.textHeight).padStart(6)}` +
      `  ${cell.fontSize}  ${cell.text}`,
  );
}

ws.close();
