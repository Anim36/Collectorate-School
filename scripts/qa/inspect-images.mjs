/**
 * Prints every element with role="img" on a page, so a selector can be
 * checked before it is used in a comparison.
 */
const route = process.argv[2] ?? "/student/performance";
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
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  return Array.from(document.querySelectorAll('[role="img"]')).map((el) => {
    const r = el.getBoundingClientRect();
    const span = el.querySelector('span');
    return {
      label: el.getAttribute('aria-label'),
      tag: el.tagName.toLowerCase(),
      width: Math.round(r.width),
      spanWidth: span ? Math.round(span.getBoundingClientRect().width) : null,
      ratio: span ? Math.round((span.getBoundingClientRect().width / r.width) * 1000) / 1000 : null,
    };
  });
})()`;

const result = await send("Runtime.evaluate", { expression, returnByValue: true });

console.log(`=== ${route} @ ${width}px ===`);
for (const node of result.result.value ?? []) {
  console.log(
    `${node.tag.padEnd(6)} w ${String(node.width).padStart(6)}` +
      `  span ${String(node.spanWidth).padStart(6)}  ratio ${node.ratio}  ${node.label ?? ""}`,
  );
}

ws.close();
