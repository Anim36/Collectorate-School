/**
 * Measures the users pagination line at 375px.
 *
 * Usage: node scripts/qa/measure-users-pagination.mjs
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
    const nav = document.querySelector('nav[aria-label="Pagination"]');
    const wrapper = nav?.parentElement;
    const summary = wrapper?.querySelector('p');
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
    };
    return {
      wrapper: rect(wrapper),
      summary: rect(summary),
      summaryText: summary?.textContent.trim(),
      nav: rect(nav),
      pageButtons: [...(nav?.querySelectorAll('button') ?? [])].map((b) => ({ label: b.textContent.trim(), ...rect(b) })),
      containerWidth: wrapper?.parentElement ? Math.round(wrapper.parentElement.getBoundingClientRect().width) : null,
    };
  })()`,
  returnByValue: true,
});

console.log(JSON.stringify(result.result.value, null, 2));
ws.close();
