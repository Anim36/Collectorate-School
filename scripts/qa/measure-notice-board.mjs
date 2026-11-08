/**
 * Measures the blocks of the public notice board on mobile, so the deviation
 * from the Figma frame can be traced to a single element.
 *
 * Usage: node scripts/qa/measure-notice-board.mjs
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
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 375,
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3111/notice" });
await new Promise((resolve) => setTimeout(resolve, 2500));

const result = await send("Runtime.evaluate", {
  expression: `(() => {
    const main = document.querySelector('main');
    const section = main?.children[1];
    const board = section?.firstElementChild;
    const filters = board?.children[0];
    const results = board?.children[1];
    const table = results?.firstElementChild;

    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.top),
        height: Math.round(r.height),
        width: Math.round(r.width),
        text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 34),
      };
    };

    const mobileList = table?.querySelector('ul');
    const records = Array.from(mobileList?.children ?? []).map(box);

    return {
      section: box(section),
      board: box(board),
      filters: box(filters),
      filterChildren: Array.from(filters?.children ?? []).map(box),
      results: box(results),
      table: box(table),
      mobileList: box(mobileList),
      records,
      pagination: box(table?.lastElementChild),
    };
  })()`,
  returnByValue: true,
});

const data = result.result.value;

console.log("=== /notice @ 375px ===");
for (const key of ["section", "board", "filters", "results", "table", "mobileList", "pagination"]) {
  const box = data[key];
  console.log(
    `${key.padEnd(14)} ${box ? `top ${String(box.top).padStart(5)}  h ${String(box.height).padStart(5)}  w ${box.width}  "${box.text}"` : "absent"}`,
  );
}

console.log("\nfilter children:");
for (const box of data.filterChildren) {
  console.log(`  top ${String(box.top).padStart(5)}  h ${String(box.height).padStart(5)}  "${box.text}"`);
}

console.log("\nmobile records:");
data.records.forEach((box, index) => {
  console.log(`  ${index}  top ${String(box.top).padStart(5)}  h ${String(box.height).padStart(5)}  "${box.text}"`);
});

ws.close();
