/**
 * Reads the computed style of the utility group in the sticky navbar.
 *
 * The utility buttons sit over a photograph, so their own surface has to be
 * transparent. The theme toggle is a shared button component, so this checks
 * that the navbar overrides its surface.
 *
 * Usage: node scripts/qa/measure-navbar-utility.mjs [route]
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
  const props = ['background-color', 'color', 'border-radius', 'width', 'height', 'border-color'];
  const style = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const out = {};
    for (const p of props) out[p] = cs.getPropertyValue(p);
    return out;
  };
  const buttons = Array.from(
    header.querySelectorAll('a[aria-label], button[aria-label]'),
  ).map((el) => ({
    label: el.getAttribute('aria-label'),
    tag: el.tagName.toLowerCase(),
    style: style(el),
    svg: el.querySelector('svg')
      ? getComputedStyle(el.querySelector('svg')).width
      : null,
  }));
  return { buttons };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log(JSON.stringify(result.result.value, null, 1));

ws.close();
