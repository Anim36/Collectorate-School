/**
 * Opens the desktop "Admission" dropdown with a real mouse click through the
 * CDP Input domain (Radix menus respond to pointer events, not .click()).
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
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3111/" });
await new Promise((resolve) => setTimeout(resolve, 2500));

const box = await send("Runtime.evaluate", {
  expression: `(() => {
    const trigger = Array.from(document.querySelectorAll('header nav button')).find((b) =>
      b.textContent.includes('Admission'));
    if (!trigger) return null;
    const r = trigger.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`,
  returnByValue: true,
});

if (!box.result.value) {
  console.log("TRIGGER NOT FOUND");
  ws.close();
  process.exit(1);
}

const { x, y } = box.result.value;

await send("Input.dispatchMouseEvent", {
  type: "mousePressed",
  x,
  y,
  button: "left",
  clickCount: 1,
});
await send("Input.dispatchMouseEvent", {
  type: "mouseReleased",
  x,
  y,
  button: "left",
  clickCount: 1,
});
await new Promise((resolve) => setTimeout(resolve, 600));

const result = await send("Runtime.evaluate", {
  expression: `(() => {
    const wrapper = document.querySelector('[data-radix-popper-content-wrapper]');
    const panel = wrapper ? wrapper.firstElementChild : null;
    const r = panel ? panel.getBoundingClientRect() : null;
    return {
      open: panel ? panel.getAttribute('data-state') : null,
      width: r ? Math.round(r.width) : null,
      height: r ? Math.round(r.height) : null,
      items: panel ? Array.from(panel.querySelectorAll('a')).map((a) => a.textContent.trim()) : [],
    };
  })()`,
  returnByValue: true,
});

console.log(JSON.stringify(result.result.value, null, 2));
ws.close();
