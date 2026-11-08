/**
 * Prints the rendered geometry of one section's direct children so the
 * result can be compared with the Figma frame offsets.
 *
 * Usage: node scripts/qa/measure-children.mjs <width> <sectionIndex>
 */

const width = Number(process.argv[2] ?? 375);
const height = Number(process.argv[3] ?? 800);
const index = Number(process.argv[4] ?? 0);

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
await send("Page.navigate", { url: "http://localhost:3111/" });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const section = document.querySelector('main').children[${index}];
  const sr = section.getBoundingClientRect();
  const kids = Array.from(section.children).map((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').trim().slice(0, 40),
      top: Math.round(r.top - sr.top),
      h: Math.round(r.height),
      w: Math.round(r.width),
      fontSize: cs.fontSize,
    };
  });
  return {
    sectionH: Math.round(sr.height),
    padTop: getComputedStyle(section).paddingTop,
    gap: getComputedStyle(section).gap,
    kids,
  };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log(`viewport ${width} section[${index}]`);
console.log(JSON.stringify(result.result.value, null, 2));
ws.close();
