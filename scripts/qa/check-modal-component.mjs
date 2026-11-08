/**
 * Measures the payment method modal on the design-system page against the
 * Figma component symbol "Modal / Payment method" (2:17451).
 *
 * Usage: node scripts/qa/check-modal-component.mjs
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
  height: 1400,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3111/design-system" });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
  return dialogs.map((dialog) => {
    const r = dialog.getBoundingClientRect();
    const box = (el) => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        top: Math.round(rect.top - r.top),
        left: Math.round(rect.left - r.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: (el.textContent || '').trim().slice(0, 30),
      };
    };
    return {
      dialog: { width: Math.round(r.width), height: Math.round(r.height) },
      title: box(dialog.querySelector('h2')),
      description: box(dialog.querySelector('p')),
      options: Array.from(dialog.querySelectorAll('[role="radio"]')).map(box),
      buttons: Array.from(dialog.querySelectorAll('button')).map(box),
    };
  });
})()`;

const result = await send("Runtime.evaluate", { expression, returnByValue: true });

console.log("Figma symbol 2:17451 is 560x554");
console.log("  title top 25 h 35 · desc top 76 h 23");
console.log("  options top 115 / 204 / 293, h 73");
console.log("  note top 382 h 19");
console.log("  Continue top 417 left 25 w 191 h 47");
console.log("  Cancel top 480 left 25 w 104 h 49\n");

for (const data of result.result.value ?? []) {
  console.log(
    `dialog w ${data.dialog.width} h ${data.dialog.height}  ` +
      `title top ${data.title?.top} h ${data.title?.height}  ` +
      `desc top ${data.description?.top} h ${data.description?.height}`,
  );
  for (const option of data.options) {
    console.log(
      `  option top ${String(option.top).padStart(4)} left ${String(option.left).padStart(4)} w ${option.width} h ${option.height} "${option.text}"`,
    );
  }
  for (const button of data.buttons) {
    console.log(
      `  button top ${String(button.top).padStart(4)} left ${String(button.left).padStart(4)} w ${button.width} h ${button.height} "${button.text}"`,
    );
  }
}

ws.close();
