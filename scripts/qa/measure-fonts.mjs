/**
 * Measures a string in the page's own font and in a named webfont, both as
 * the browser resolves them.
 *
 * Usage: node scripts/qa/measure-fonts.mjs <route> <selector> <candidatesFile> [width]
 */
import fs from "node:fs";

const route = process.argv[2] ?? "/student/dashboard";
const selector = process.argv[3] ?? "main > div > section > p";
const candidatesFile = process.argv[4] ?? ".tmp-candidates.txt";
const width = Number(process.argv[5] ?? "1440");

const texts = fs
  .readFileSync(candidatesFile, "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

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
  const probe = document.querySelector(${JSON.stringify(selector)});
  if (!probe) return null;
  const cs = getComputedStyle(probe);
  const texts = ${JSON.stringify(texts)};

  const measure = (family, text) => {
    const span = document.createElement('span');
    span.textContent = text;
    span.style.position = 'fixed';
    span.style.top = '0';
    span.style.left = '0';
    span.style.whiteSpace = 'nowrap';
    span.style.fontSize = cs.fontSize;
    span.style.fontWeight = cs.fontWeight;
    span.style.fontFamily = family;
    document.body.appendChild(span);
    const width = Math.round(span.getBoundingClientRect().width);
    span.remove();
    return width;
  };

  return {
    resolved: cs.fontFamily,
    rows: texts.map((text) => ({
      text,
      resolvedWidth: measure(cs.fontFamily, text),
      interWidth: measure('Inter', text),
      notoWidth: measure('"Noto Sans Bengali"', text),
    })),
  };
})()`;

const result = await send("Runtime.evaluate", { expression, returnByValue: true });
const data = result.result.value;
if (!data) {
  console.log("NO PROBE");
  console.log(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(`resolved: ${data.resolved}\n`);
for (const row of data.rows) {
  console.log(
    `  resolved ${String(row.resolvedWidth).padStart(4)}  inter ${String(row.interWidth).padStart(4)}  noto ${String(row.notoWidth).padStart(4)}   ${JSON.stringify(row.text)}`,
  );
}

ws.close();
