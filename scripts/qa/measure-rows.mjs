/**
 * Prints the geometry of the rows inside a rendered table.
 *
 * Usage: node scripts/qa/measure-rows.mjs <route> <width> <selector>
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
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return {
      top: Math.round((r.top + window.scrollY) * 10) / 10,
      height: Math.round(r.height * 10) / 10,
      tag: el.tagName.toLowerCase(),
      label: (el.textContent || "").trim().slice(0, 30),
    };
  };
  const rows = Array.from(root.querySelectorAll("tr")).map(box);
  const cells = Array.from(root.querySelectorAll("tbody tr:first-child td")).map(box);
  const head = Array.from(root.querySelectorAll("thead tr")).map(box);
  return { rows, cells, head };
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
console.log("thead:");
for (const row of actual.head) console.log(`  ${row.tag} top ${row.top} h ${row.height}`);
console.log("rows:");
let prevBottom = null;
for (const row of actual.rows) {
  const gap = prevBottom === null ? "" : row.top - prevBottom;
  console.log(
    `  ${row.tag} top ${String(row.top).padStart(7)} h ${String(row.height).padStart(6)}` +
      ` bottom ${String(row.top + row.height).padStart(7)} gapAbove=${String(gap).padStart(6)}  ${row.label}`,
  );
  prevBottom = row.top + row.height;
}
console.log("first body row cells:");
for (const cell of actual.cells) {
  console.log(`  ${cell.tag} top ${cell.top} h ${cell.height}  ${cell.label}`);
}

ws.close();
