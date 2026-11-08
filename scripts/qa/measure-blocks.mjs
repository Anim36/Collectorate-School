/**
 * Prints the geometry of the blocks inside a page body.
 *
 * Usage: node scripts/qa/measure-blocks.mjs <route> <width> <selector>
 */
const route = process.argv[2] ?? "/notice";
const width = Number(process.argv[3] ?? 1440);
const height = Number(process.argv[4] ?? 1200);
const selector = process.argv[5] ?? "main > section > div";

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
      top: Math.round(r.top + window.scrollY),
      height: Math.round(r.height),
      width: Math.round(r.width),
      tag: el.tagName.toLowerCase(),
      label: (el.textContent || "").trim().slice(0, 40),
    };
  };
  return { root: box(root), kids: Array.from(root.children).map(box) };
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
console.log(`root  top ${actual.root.top}  h ${actual.root.height}  w ${actual.root.width}`);
let prevBottom = null;
for (const kid of actual.kids) {
  const gap = prevBottom === null ? "" : kid.top - prevBottom;
  console.log(
    `  ${kid.tag.padEnd(6)} top ${String(kid.top).padStart(5)} h ${String(kid.height).padStart(5)} w ${String(kid.width).padStart(5)}` +
      ` bottom ${String(kid.top + kid.height).padStart(5)}  gapAbove=${String(gap).padStart(4)}  ${kid.label}`,
  );
  prevBottom = kid.top + kid.height;
}

ws.close();
