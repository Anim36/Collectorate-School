/**
 * Reports the resolved colours of the new student pages in both themes, so
 * the dark frames can be checked against the Figma palette.
 *
 * Usage: node scripts/qa/check-student-colors.mjs <route>
 */
const route = process.argv[2] ?? "/student/performance";

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

const expression = `(() => {
  const main = document.querySelector('main');
  const body = document.querySelector('main > div');
  const card = document.querySelector('main section');
  const heading = document.querySelector('main h2');
  const muted = document.querySelector('main h2 + p');
  const bar = document.querySelector('main [role="img"] span');
  const grid = document.querySelector('.recharts-cartesian-grid line');
  const line = document.querySelector('.recharts-line-curve');
  const button = document.querySelector('main button');
  const header = document.querySelector('main thead th');
  const css = (el) => (el ? getComputedStyle(el) : null);
  return {
    htmlClass: document.documentElement.className,
    bodyBg: css(body)?.backgroundColor,
    bodyColor: css(body)?.color,
    cardBg: css(card)?.backgroundColor,
    cardBorder: css(card)?.borderColor,
    headingColor: css(heading)?.color,
    mutedColor: css(muted)?.color,
    barBg: css(bar)?.backgroundColor,
    gridStroke: css(grid)?.stroke,
    lineStroke: css(line)?.stroke,
    buttonBg: css(button)?.backgroundColor,
    buttonColor: css(button)?.color,
    headerBg: css(header)?.backgroundColor,
  };
})()`;

for (const theme of ["light", "dark"]) {
  await send("Page.navigate", { url: `http://localhost:3111${route}` });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await send("Runtime.evaluate", {
    expression: `localStorage.setItem('theme', '${theme}')`,
  });
  await send("Page.reload", { ignoreCache: true });
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const result = await send("Runtime.evaluate", { expression, returnByValue: true });
  const data = result.result.value;

  console.log(`\n=== ${route} · ${theme} ===`);
  console.log(`html class      ${data.htmlClass}`);
  console.log(`body bg         ${data.bodyBg}`);
  console.log(`card bg         ${data.cardBg}`);
  console.log(`card border     ${data.cardBorder}`);
  console.log(`heading colour  ${data.headingColor}`);
  console.log(`muted colour    ${data.mutedColor}`);
  console.log(`bar fill        ${data.barBg}`);
  console.log(`gridline        ${data.gridStroke}`);
  console.log(`chart line      ${data.lineStroke}`);
  console.log(`button bg       ${data.buttonBg}`);
  console.log(`button colour   ${data.buttonColor}`);
  console.log(`table header    ${data.headerBg}`);
}

ws.close();
