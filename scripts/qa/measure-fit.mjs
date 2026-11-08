/**
 * Reports the natural and available width of the text inside a page element,
 * so a line that wraps by a pixel can be spotted.
 *
 * Usage: node scripts/qa/measure-fit.mjs <route> <width> <selector>
 */
const route = process.argv[2] ?? "/student/performance";
const width = Number(process.argv[3] ?? 768);
const selector = process.argv[4] ?? "main > div p";

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
  height: 1400,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
  return nodes.map((el) => {
    const cs = getComputedStyle(el);
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = Array.from(range.getClientRects());
    const tops = [];
    for (const r of rects) {
      if (!tops.some((t) => Math.abs(t - r.top) < 2)) tops.push(Math.round(r.top));
    }
    return {
      text: (el.textContent || '').trim().slice(0, 40),
      client: Math.round(el.clientWidth * 100) / 100,
      natural: Math.round(Math.max(...rects.map((r) => r.width)) * 100) / 100,
      lines: tops.length,
      font: cs.fontFamily,
      size: cs.fontSize,
    };
  });
})()`;

const result = await send("Runtime.evaluate", { expression, returnByValue: true });

console.log(`=== ${route} @ ${width}px ===`);
for (const node of result.result.value ?? []) {
  console.log(
    `client ${String(node.client).padStart(7)}  natural ${String(node.natural).padStart(7)}` +
      `  lines ${node.lines}  ${node.size}  ${node.text}`,
  );
}

ws.close();
