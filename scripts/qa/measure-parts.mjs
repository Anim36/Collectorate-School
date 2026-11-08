/**
 * Measures every element matching a selector inside the page, printing the
 * box and the computed font size so wrapping can be compared with Figma.
 */
const route = process.argv[2] ?? "/admission";
const width = Number(process.argv[3] ?? 375);
const selector = process.argv[4] ?? "main > section:last-child > ul > li";

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
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const parts = [];
    for (const child of el.children) {
      const cr = child.getBoundingClientRect();
      const ccs = getComputedStyle(child);
      parts.push({
        tag: child.tagName.toLowerCase(),
        h: Math.round(cr.height),
        top: Math.round(cr.top - r.top),
        font: ccs.fontSize,
        text: (child.textContent || "").trim().slice(0, 34),
      });
    }
    return {
      h: Math.round(r.height),
      pad: cs.padding,
      gap: cs.gap,
      text: (el.textContent || "").trim().slice(0, 34),
      parts,
    };
  });
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log(`=== ${route} @ ${width}px :: ${selector} ===`);
for (const node of result.result.value ?? []) {
  console.log(`\n  h=${node.h} pad=${node.pad} gap=${node.gap}  "${node.text}"`);
  for (const part of node.parts) {
    console.log(
      `     ${part.tag.padEnd(5)} top ${String(part.top).padStart(4)} h ${String(part.h).padStart(4)} font ${part.font.padStart(6)}  ${part.text}`,
    );
  }
}

ws.close();
