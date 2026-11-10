/**
 * Reads the sticky navbar in the dark theme.
 *
 * The band is drawn over a photograph, so the colours of the band, the pill
 * and the utility group have to be read in the dark theme as well.
 *
 * Usage: node scripts/qa/measure-navbar-dark.mjs [route]
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
await new Promise((resolve) => setTimeout(resolve, 1500));
await send("Runtime.evaluate", {
  expression: `localStorage.setItem('theme', 'dark')`,
});
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const header = document.querySelector('header');
  const style = (el, props) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const out = {};
    for (const p of props) out[p] = cs.getPropertyValue(p);
    return out;
  };
  return {
    theme: document.documentElement.className,
    scrim: style(header.querySelector('div[aria-hidden] > div'), ['background-color']),
    pill: style(header.querySelector('nav ul'), [
      'background-color',
      'border-color',
      'backdrop-filter',
    ]),
    link: style(header.querySelector('nav ul a'), ['color']),
    active: style(header.querySelector('nav ul a[aria-current="page"]'), ['color']),
    brand: style(header.querySelector('header a span'), ['color']),
    divider: style(
      header.querySelector('header a span[aria-hidden]'),
      ['background-color'],
    ),
    badge: style(header.querySelector('a[aria-label^="Notice board"] > span'), [
      'background-color',
      'color',
    ]),
    toggle: style(header.querySelector('button[aria-label*="theme"]'), [
      'background-color',
      'color',
    ]),
  };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log(JSON.stringify(result.result.value, null, 1));

ws.close();
