/**
 * Reports the rendered width of the text nodes of a route, so a heading that
 * wraps when Figma draws it on one line can be traced.
 *
 * Usage: node scripts/qa/measure-text.mjs <route> <width> [needle]
 */
const route = process.argv[2] ?? "/notice";
const width = Number(process.argv[3] ?? 375);
const needle = process.argv[4] ?? "";

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
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
});

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) return { error: result.exceptionDetails.text };
  return result.result.value;
}

await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2600));

console.log(
  JSON.stringify(
    await evaluate(`(() => {
      const needle = ${JSON.stringify(needle)};
      const out = [];

      for (const el of document.querySelectorAll("h1, h2, h3, p, span, label")) {
        const text = el.textContent.trim();
        if (!text) continue;
        if (needle && !text.includes(needle)) continue;
        if (el.children.length > 0) continue;

        const style = getComputedStyle(el);
        const range = document.createRange();
        range.selectNodeContents(el);
        const rects = [...range.getClientRects()];

        out.push({
          text: text.slice(0, 44),
          size: style.fontSize,
          weight: style.fontWeight,
          boxWidth: Math.round(el.getBoundingClientRect().width),
          textWidth: Math.round(rects.reduce((sum, r) => sum + r.width, 0)),
          lines: rects.length,
          height: Math.round(el.getBoundingClientRect().height),
        });
      }

      return out;
    })()`),
    null,
    1,
  ),
);

ws.close();
