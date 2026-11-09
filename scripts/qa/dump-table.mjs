/**
 * Dumps the rows of a table on a page, as they are laid out.
 *
 * Usage: node scripts/qa/dump-table.mjs /admin/gallery 1440
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
  const content = document.querySelector('[data-portal="content"]');
  if (!content) return null;
  const root = content.firstElementChild;

  const panels = Array.from(root.querySelectorAll('table, ul')).map((el) => {
    const r = el.getBoundingClientRect();
    const rows = Array.from(el.children).map((row) => {
      const rr = row.getBoundingClientRect();
      return {
        tag: row.tagName.toLowerCase(),
        h: Math.round(rr.height),
        text: (row.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 60),
      };
    });
    return {
      tag: el.tagName.toLowerCase(),
      h: Math.round(r.height),
      rowCount: rows.length,
      rows: rows.slice(0, 14),
    };
  });

  return panels;
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log(JSON.stringify(result?.result?.value, null, 1));

ws.close();
