/**
 * Prints the box of every element matching a selector inside the page, with
 * its padding, so a card's content width can be compared with Figma.
 *
 * Usage: node scripts/qa/measure-boxes.mjs <route> <width> <selector>
 */
const route = process.argv[2] ?? "/student/performance";
const width = Number(process.argv[3] ?? 768);
const selector = process.argv[4] ?? "main > div > div:nth-of-type(2) > div > div";

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
  return Array.from(document.querySelectorAll(${JSON.stringify(selector)})).map((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      width: Math.round(r.width * 100) / 100,
      height: Math.round(r.height * 100) / 100,
      padding: cs.padding,
      display: cs.display,
      text: (el.textContent || '').trim().slice(0, 30),
    };
  });
})()`;

const result = await send("Runtime.evaluate", { expression, returnByValue: true });

console.log(`=== ${route} @ ${width}px ===`);
for (const node of result.result.value ?? []) {
  console.log(
    `w ${String(node.width).padStart(7)}  h ${String(node.height).padStart(7)}` +
      `  pad ${node.padding.padEnd(14)}  ${node.display.padEnd(10)}  ${node.text}`,
  );
}

ws.close();
