/**
 * Prints the class list and computed style of the first calendar cells.
 *
 * Usage: node scripts/qa/inspect-calendar.mjs <route> <width>
 */
const route = process.argv[2] ?? "/calendar";
const width = Number(process.argv[3] ?? 1440);
const height = Number(process.argv[4] ?? 1200);

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
  const grid = document.querySelector('main > section > div > div:nth-child(2)');
  if (!grid) return null;
  const gridStyle = getComputedStyle(grid);
  const rows = Array.from(grid.children).map((child) => {
    const r = child.getBoundingClientRect();
    return {
      tag: child.tagName.toLowerCase(),
      className: child.className,
      top: Math.round((r.top + window.scrollY) * 10) / 10,
      height: Math.round(r.height * 10) / 10,
      gap: getComputedStyle(child).gap,
    };
  });
  const cellRows = Array.from(grid.children[1].children).map((cell) => {
    const r = cell.getBoundingClientRect();
    return {
      top: Math.round((r.top + window.scrollY) * 10) / 10,
      height: Math.round(r.height * 10) / 10,
      minHeight: getComputedStyle(cell).minHeight,
    };
  });
  return { gridClass: grid.className, gridGap: gridStyle.gap, rows, cellRows };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log(JSON.stringify(result.result.value, null, 2));

ws.close();
