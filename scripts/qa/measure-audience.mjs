/**
 * Measures the width of the audience row on the notices page.
 *
 * Usage: node scripts/qa/measure-audience.mjs 375
 */

const width = Number(process.argv[2] ?? 375);

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
    const messageId = ++id;
    pending.set(messageId, resolve);
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });
}

ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);

  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result);
    pending.delete(message.id);
  }
});

await new Promise((resolve) => ws.addEventListener("open", resolve));

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
});

await send("Page.navigate", { url: "http://localhost:3111/admin/notices" });
await new Promise((resolve) => setTimeout(resolve, 2600));

const expression = `(() => {
  const labels = Array.from(document.querySelectorAll('label'))
    .filter((el) => el.closest('div') && /Public|Students|Teachers|Guardians/.test(el.textContent || ''));
  if (!labels.length) return null;

  const row = labels[0].parentElement;
  const rr = row.getBoundingClientRect();
  const style = getComputedStyle(row);

  return {
    rowWidth: Math.round(rr.width),
    rowHeight: Math.round(rr.height),
    gapX: style.columnGap,
    gapY: style.rowGap,
    items: labels.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        text: (el.textContent || '').trim(),
        w: Math.round(r.width),
        top: Math.round(r.top - rr.top),
      };
    }),
  };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log(JSON.stringify(result?.result?.value, null, 1));

ws.close();
