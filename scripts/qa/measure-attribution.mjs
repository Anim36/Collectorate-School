/**
 * Measures the rendered width of the head-message attribution in several
 * weights so the mobile wrapping can be matched to the Figma text node.
 *
 * Usage: node scripts/qa/measure-attribution.mjs
 */
const strings = [
  "Md. Anisur Rahman · Head of Institution",
  "Md. Anisur Rahman",
  "Head of Institution",
];

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
await send("Page.navigate", { url: "http://localhost:3111/about" });
await new Promise((resolve) => setTimeout(resolve, 2000));

const expression = `(() => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const out = [];
  for (const size of [16, 15, 14, 13]) {
    for (const weight of [600, 500, 400]) {
      ctx.font = weight + ' ' + size + 'px Inter, "Inter Fallback", system-ui, sans-serif';
      const row = { size, weight, items: [] };
      for (const s of ${JSON.stringify(strings)}) {
        row.items.push({ text: s, width: Math.round(ctx.measureText(s).width) });
      }
      out.push(row);
    }
  }
  return out;
})()`;

const result = await send("Runtime.evaluate", { expression, returnByValue: true });
for (const row of result.result.value ?? []) {
  console.log(`\n${row.size}px / ${row.weight}`);
  for (const item of row.items) {
    console.log(`   ${String(item.width).padStart(4)}px  ${item.text}`);
  }
}

ws.close();
