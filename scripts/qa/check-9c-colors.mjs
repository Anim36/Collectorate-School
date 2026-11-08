/**
 * Reports the resolved colours of the 9C student notice and gallery pages in
 * both themes, so the CSS-variable driven light and dark palettes can be
 * checked against the Figma palette.
 *
 * Usage: node scripts/qa/check-9c-colors.mjs
 */
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
  width: 1440,
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true });
  return result.result.value;
};

const expression = `(() => {
  const root = document.documentElement;
  const panel = document.querySelector('main [data-portal="content"] > div > div:nth-child(3)') ||
    document.querySelector('main section');
  const heading = document.querySelector('main h2');
  const table = document.querySelector('main table');
  const headerCell = document.querySelector('main table th');
  const box = (el) => {
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      bg: s.backgroundColor,
      color: s.color,
      border: s.borderTopColor,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
    };
  };
  return {
    htmlClass: root.className,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyColor: getComputedStyle(document.body).color,
    heading: box(heading),
    panel: box(panel),
    table: box(table),
    headerCell: box(headerCell),
  };
})()`;

for (const theme of ["light", "dark"]) {
  for (const route of ["/student/notice", "/student/gallery"]) {
    await send("Page.navigate", { url: `http://localhost:3111${route}` });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await send("Runtime.evaluate", {
      expression: `localStorage.setItem('theme', '${theme}')`,
    });
    await send("Page.reload", { ignoreCache: true });
    await new Promise((resolve) => setTimeout(resolve, 2200));

    const data = await evaluate(expression);
    console.log(`\n=== ${route} :: ${theme} ===`);
    console.log(`html class : ${data.htmlClass}`);
    console.log(`body       : bg ${data.bodyBg}  color ${data.bodyColor}`);
    console.log(`heading    : ${JSON.stringify(data.heading)}`);
    console.log(`panel      : ${JSON.stringify(data.panel)}`);
    console.log(`table      : ${JSON.stringify(data.table)}`);
    console.log(`headerCell : ${JSON.stringify(data.headerCell)}`);
  }
}

ws.close();
