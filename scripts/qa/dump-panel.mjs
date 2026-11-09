/**
 * Dumps the boxes inside the table panel of a page.
 *
 * Usage: node scripts/qa/dump-panel.mjs /admin/gallery 1440
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

  const panel = Array.from(root.children).find(
    (el) => el.tagName === 'DIV' && el.querySelector('table'),
  );
  if (!panel) return null;

  const pr = panel.getBoundingClientRect();
  const style = getComputedStyle(panel);

  const children = Array.from(panel.children).map((el) => {
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      top: Math.round(r.top - pr.top),
      h: Math.round(r.height),
      display: getComputedStyle(el).display,
      text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40),
    };
  });

  const thead = panel.querySelector('thead');
  const tbody = panel.querySelector('tbody');

  return {
    panel: {
      h: Math.round(pr.height),
      padTop: style.paddingTop,
      padBottom: style.paddingBottom,
    },
    thead: thead ? Math.round(thead.getBoundingClientRect().height) : null,
    tbody: tbody ? Math.round(tbody.getBoundingClientRect().height) : null,
    children,
  };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log(JSON.stringify(result?.result?.value, null, 1));

ws.close();
