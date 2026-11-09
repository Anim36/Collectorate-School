/**
 * Measures the utility bar: the band box, the location line, and the run of
 * utility links, so their alignment can be checked at each breakpoint.
 *
 * Usage: node scripts/qa/measure-utility-bar.mjs [route]
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

for (const width of [1440, 768, 375]) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: `http://localhost:3111${route}` });
  await new Promise((resolve) => setTimeout(resolve, 2200));

  const expression = `(() => {
    const bar = document.querySelector('body > div > div:first-child');
    if (!bar) return null;
    const br = bar.getBoundingClientRect();
    const cs = getComputedStyle(bar);
    const location = bar.querySelector('p');
    const list = bar.querySelector('ul');
    const mobile = bar.querySelector('div.md\\\\:hidden');
    const links = list
      ? Array.from(list.querySelectorAll('a')).map((a) => {
          const r = a.getBoundingClientRect();
          return {
            text: a.textContent.trim(),
            left: Math.round(r.left),
            right: Math.round(r.right),
          };
        })
      : [];
    const mobileLinks = mobile
      ? Array.from(mobile.querySelectorAll('a')).map((a) => {
          const r = a.getBoundingClientRect();
          return {
            text: a.textContent.trim(),
            left: Math.round(r.left),
            right: Math.round(r.right),
          };
        })
      : [];
    return {
      width: innerWidth,
      barHeight: Math.round(br.height),
      padLeft: cs.paddingLeft,
      padRight: cs.paddingRight,
      location: location
        ? {
            text: location.textContent.trim(),
            left: Math.round(location.getBoundingClientRect().left),
          }
        : null,
      listLeft: list ? Math.round(list.getBoundingClientRect().left) : null,
      listRight: list ? Math.round(list.getBoundingClientRect().right) : null,
      links,
      mobileLinks,
    };
  })()`;

  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });

  console.log(JSON.stringify(result.result.value, null, 1));
}

ws.close();
