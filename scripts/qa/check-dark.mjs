/**
 * Verifies the dark theme on the public pages: switches the next-themes
 * class to "dark", re-measures the page geometry and reports the resolved
 * colours of the key surfaces.
 *
 * Usage: node scripts/qa/check-dark.mjs <route> <width>
 */
const route = process.argv[2] ?? "/about";
const width = Number(process.argv[3] ?? 1440);
const height = Number(process.argv[4] ?? 1200);

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
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
});

await new Promise((resolve) => ws.addEventListener("open", resolve));
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: false,
});

await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2000));

// Force the dark theme through next-themes' storage key.
await send("Runtime.evaluate", {
  expression: `localStorage.setItem('theme', 'dark')`,
  returnByValue: true,
});
await send("Page.reload", { ignoreCache: true });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const root = document.documentElement;
  const main = document.querySelector('main');
  const sections = Array.from(main.children);
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top + window.scrollY),
      height: Math.round(r.height),
      color: getComputedStyle(el).color,
      background: getComputedStyle(el).backgroundColor,
    };
  };
  const cards = Array.from(document.querySelectorAll('main article')).slice(0, 3).map(box);
  return {
    htmlClass: root.className,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyColor: getComputedStyle(document.body).color,
    sections: sections.map(box),
    cards,
    totalHeight: Math.round(document.documentElement.scrollHeight),
  };
})()`;

const result = await send("Runtime.evaluate", { expression, returnByValue: true });
const data = result.result.value;

console.log(`=== ${route} @ ${width}px :: dark ===`);
console.log(`html class: ${data.htmlClass}`);
console.log(`body bg ${data.bodyBg}  color ${data.bodyColor}`);
for (const section of data.sections) {
  console.log(
    `  section top ${String(section.top).padStart(5)} h ${String(section.height).padStart(5)}  bg ${section.background}  color ${section.color}`,
  );
}
for (const card of data.cards) {
  console.log(
    `  card    top ${String(card.top).padStart(5)} h ${String(card.height).padStart(5)}  bg ${card.background}  color ${card.color}`,
  );
}
console.log(`  total height ${data.totalHeight}`);

ws.close();
