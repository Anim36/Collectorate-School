/**
 * Measures the sticky navbar band.
 *
 * Reads the band, the brand, the navigation pill and the utility group from
 * the live DOM at each breakpoint, so the layout of the sticky navbar can be
 * checked without a screenshot.
 *
 * Usage: node scripts/qa/measure-navbar.mjs [route]
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

for (const width of [1440, 1366, 1280, 1024, 768, 375]) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: `http://localhost:3111${route}` });
  await new Promise((resolve) => setTimeout(resolve, 2200));

  const expression = `(() => {
    const header = document.querySelector('header');
    if (!header) return null;
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        left: Math.round(r.left),
        right: Math.round(r.right),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    };
    const pill = header.querySelector('nav ul');
    const brand = header.querySelector('header a');
    const utility = header.querySelector('header > div.relative > div:last-child');
    const links = Array.from(header.querySelectorAll('nav ul li')).map((li) => {
      const a = li.querySelector('a, button');
      return {
        text: (a?.textContent ?? '').trim(),
        left: Math.round(li.getBoundingClientRect().left),
        width: Math.round(li.getBoundingClientRect().width),
      };
    });
    const badges = Array.from(header.querySelectorAll('span')).map((s) => {
      const t = (s.textContent ?? '').trim();
      return t;
    }).filter((t) => /^\\d+$/.test(t));
    const menuButton = header.querySelector('button[aria-controls="mobile-navigation"]');
    return {
      width: innerWidth,
      header: box(header),
      brand: box(brand),
      pill: box(pill),
      utility: box(utility),
      links,
      badges,
      menuVisible: menuButton ? getComputedStyle(menuButton).display !== 'none' : false,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  })()`;

  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });

  console.log(JSON.stringify(result.result.value, null, 1));
}

ws.close();
