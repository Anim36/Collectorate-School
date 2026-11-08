/**
 * Measures the widths the mobile pagination needs.
 *
 * Usage: node scripts/qa/measure-pagination-fit.mjs
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
  width: 375,
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3111/admin/users" });
await new Promise((resolve) => setTimeout(resolve, 2200));

const result = await send("Runtime.evaluate", {
  expression: `(() => {
    const wrapper = document.querySelector('nav[aria-label="Pagination"]')?.parentElement;
    const summary = wrapper?.querySelector('p');
    const nav = wrapper?.querySelector('nav');

    // The canvas width of the Figma string, drawn in the same font.
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const style = getComputedStyle(summary);
    ctx.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
    const figma = ctx.measureText('Showing 1–4 of 1,560 users     ‹  1  2  3  …  390 ').width;
    const longest = ctx.measureText('Showing 1–4 of 1,561 users').width;

    // The width the nav takes with smaller controls.
    const measureNav = (size, gap) => {
      const items = nav.querySelectorAll('button, span');
      let w = 0;
      items.forEach((el, index) => {
        w += size;
        if (index < items.length - 1) w += gap;
      });
      return w;
    };

    return {
      containerWidth: Math.round(wrapper.parentElement.getBoundingClientRect().width),
      summaryWidth: Math.round(summary.getBoundingClientRect().width),
      summaryText: summary.textContent.trim(),
      navWidth: Math.round(nav.getBoundingClientRect().width),
      figmaStringWidth: Math.round(figma),
      longestSummaryWidth: Math.round(longest),
      nav18: measureNav(18, 2),
      nav20gap2: measureNav(20, 2),
      docScrollWidth: document.documentElement.scrollWidth,
    };
  })()`,
  returnByValue: true,
});

console.log(JSON.stringify(result.result.value, null, 2));
ws.close();
