/**
 * Prints the rendered row heights of the first table on a page.
 *
 * Usage: node scripts/qa/measure-users.mjs /admin/users 768
 */
const route = process.argv[2] ?? "/admin/users";
const width = Number(process.argv[3] ?? 1440);

const endpoint = await (await fetch("http://localhost:9222/json")).json();
const page = endpoint.find((t) => t.type === "page");
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
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const table = document.querySelector('table');
  if (!table) return null;
  const rows = [...table.querySelectorAll('tr')].map((tr) => {
    const r = tr.getBoundingClientRect();
    const cells = [...tr.children].map((td) => {
      const cr = td.getBoundingClientRect();
      const style = getComputedStyle(td);
      const inner = td.firstElementChild;
      const innerStyle = inner ? getComputedStyle(inner) : null;
      return {
        h: Math.round(cr.height),
        w: Math.round(cr.width),
        pad: style.padding,
        borderB: style.borderBottomWidth,
        innerH: inner ? Math.round(inner.getBoundingClientRect().height) : null,
        innerDisplay: innerStyle ? innerStyle.display : null,
        text: (td.textContent||'').trim().slice(0,34),
      };
    });
    return { h: Math.round(r.height), cells };
  });
  const wrapper = table.closest('div');
  return { rows, wrapperH: wrapper ? Math.round(wrapper.getBoundingClientRect().height) : 0 };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});
console.log(JSON.stringify(result.result.value, null, 2));
ws.close();
