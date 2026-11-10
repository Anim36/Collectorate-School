/**
 * Reads the computed style of the sticky navbar details.
 *
 * Checks the parts of the band that carry the glass look: the divider rule
 * in the brand, the notice badge and the underline under the open page.
 *
 * Usage: node scripts/qa/measure-navbar-style.mjs [route]
 */

const route = process.argv[2] ?? "/";

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
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const header = document.querySelector('header');
  const props = ['background-color', 'border-radius', 'color', 'height', 'width', 'content'];
  const style = (el, pseudo) => {
    if (!el) return null;
    const cs = getComputedStyle(el, pseudo || null);
    const out = {};
    for (const p of props) out[p] = cs.getPropertyValue(p);
    return out;
  };
  const brand = header.querySelector('header a');
  const divider = brand ? brand.querySelector('span[aria-hidden]') : null;
  const badge = header.querySelector('a[aria-label^="Notice board"] > span');
  const active = header.querySelector('nav ul a[aria-current="page"]');
  return {
    divider: style(divider),
    badge: badge
      ? { ...style(badge), text: badge.textContent.trim() }
      : null,
    activeUnderline: style(active, '::after'),
    activeText: style(active),
  };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log(JSON.stringify(result.result.value, null, 1));

ws.close();
