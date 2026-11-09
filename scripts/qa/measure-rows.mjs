/**
 * Measures the rows of a table, on desktop and on mobile.
 *
 * Usage: node scripts/qa/measure-rows.mjs /admin/gallery 375
 */

const route = process.argv[2] ?? "/admin/gallery";
const width = Number(process.argv[3] ?? 375);

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

  const out = [];

  for (const el of root.querySelectorAll('tbody tr, ul li')) {
    const r = el.getBoundingClientRect();
    if (r.height === 0) continue;
    const lines = Array.from(el.children).map((line) => {
      const lr = line.getBoundingClientRect();
      return {
        text: (line.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 50),
        h: Math.round(lr.height),
      };
    });
    out.push({ tag: el.tagName.toLowerCase(), h: Math.round(r.height), lines });
  }

  return out;
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log(JSON.stringify(result?.result?.value, null, 1));

ws.close();
