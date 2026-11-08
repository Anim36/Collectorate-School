/**
 * Counts the rendered line boxes of a text element so wrapping can be
 * compared with the Figma text node height.
 *
 * Usage: node scripts/qa/measure-lines.mjs <route> <width> <selector>
 */
const route = process.argv[2] ?? "/about";
const width = Number(process.argv[3] ?? 375);
const selector = process.argv[4] ?? "p";

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
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
  return nodes.map((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = Array.from(range.getClientRects());
    const tops = [];
    for (const r of rects) {
      if (!tops.some((t) => Math.abs(t - r.top) < 2)) tops.push(Math.round(r.top));
    }
    const cs = getComputedStyle(el);
    const w = el.getBoundingClientRect().width;
    return {
      lines: tops.length,
      width: Math.round(w),
      font: cs.fontSize,
      lineHeight: cs.lineHeight,
      height: Math.round(el.getBoundingClientRect().height),
      text: (el.textContent || "").trim().slice(0, 60),
    };
  });
})()`;

const result = await send("Runtime.evaluate", { expression, returnByValue: true });

console.log(`=== ${route} @ ${width}px :: ${selector} ===`);
for (const node of result.result.value ?? []) {
  console.log(
    `  lines ${String(node.lines).padStart(2)}  w ${String(node.width).padStart(4)}  h ${String(node.height).padStart(4)}  font ${node.font} lh ${node.lineHeight}  "${node.text}"`,
  );
}

ws.close();
