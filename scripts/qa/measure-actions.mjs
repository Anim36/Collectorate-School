/**
 * Measures the actions cell of the first row of a table.
 *
 * Usage: node scripts/qa/measure-actions.mjs /admin/gallery 1440
 */

const route = process.argv[2] ?? "/admin/gallery";
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

await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2600));

const expression = `(() => {
  const rows = Array.from(document.querySelectorAll('tbody tr'));
  if (!rows.length) return null;

  return rows.slice(0, 3).map((row) => {
    const rr = row.getBoundingClientRect();
    const cells = Array.from(row.children).map((cell) => {
      const cr = cell.getBoundingClientRect();
      const inner = Array.from(cell.querySelectorAll('*')).map((el) => {
        const er = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 30),
          w: Math.round(er.width),
          h: Math.round(er.height),
          top: Math.round(er.top - rr.top),
        };
      });
      return {
        text: (cell.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40),
        w: Math.round(cr.width),
        h: Math.round(cr.height),
        inner: inner.slice(0, 8),
      };
    });
    return { h: Math.round(rr.height), cells };
  });
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log(JSON.stringify(result?.result?.value, null, 1));

ws.close();
