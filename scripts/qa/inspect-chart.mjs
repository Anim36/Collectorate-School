/**
 * Prints the rendered SVG structure of the marks chart so its geometry can be
 * compared with the Figma plot.
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
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3111/student/performance" });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const surface = document.querySelector('.recharts-surface');
  if (!surface) return null;
  const gridLines = Array.from(
    document.querySelectorAll('.recharts-cartesian-grid line'),
  ).map((line) => ({
    x1: Math.round(line.getAttribute('x1')),
    x2: Math.round(line.getAttribute('x2')),
    y1: Math.round(line.getAttribute('y1')),
    y2: Math.round(line.getAttribute('y2')),
  }));
  const path = document.querySelector('.recharts-line-curve');
  const plot = surface.getBoundingClientRect();
  return {
    surface: { w: Math.round(plot.width), h: Math.round(plot.height) },
    gridLines,
    path: path ? path.getAttribute('d') : null,
  };
})()`;

const result = await send("Runtime.evaluate", { expression, returnByValue: true });
console.log(JSON.stringify(result.result.value, null, 2));

ws.close();
