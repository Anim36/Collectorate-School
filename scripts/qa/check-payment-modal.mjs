/**
 * Measures the payment method modal against the Figma frame
 * "Payment method modal" (2:5858 desktop, 2:5936 tablet, 2:6025 mobile).
 *
 * Usage: node scripts/qa/check-payment-modal.mjs [width]
 */
const width = Number(process.argv[2] ?? 1440);

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
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3111/student/fees" });
await new Promise((resolve) => setTimeout(resolve, 2500));

await send("Runtime.evaluate", {
  expression: `(() => {
    const button = Array.from(document.querySelectorAll('main button')).find((el) =>
      el.textContent.includes('Pay Now'),
    );
    button.click();
  })()`,
});
await new Promise((resolve) => setTimeout(resolve, 600));

const expression = `(() => {
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return null;
  const r = dialog.getBoundingClientRect();
  const box = (el) => {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      top: Math.round(rect.top - r.top),
      left: Math.round(rect.left - r.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      text: (el.textContent || '').trim().slice(0, 34),
    };
  };
  const options = Array.from(dialog.querySelectorAll('[role="radio"]'));
  const buttons = Array.from(dialog.querySelectorAll('button'));
  return {
    dialog: { width: Math.round(r.width), height: Math.round(r.height) },
    title: box(dialog.querySelector('h2')),
    description: box(dialog.querySelector('p')),
    options: options.map(box),
    buttons: buttons.map(box),
  };
})()`;

const result = await send("Runtime.evaluate", { expression, returnByValue: true });
const data = result.result.value;

if (!data) {
  console.log("NO MODAL");
  process.exit(1);
}

console.log(`=== payment modal @ ${width}px ===`);
console.log(
  `dialog  w ${data.dialog.width}  h ${data.dialog.height}` +
    `  (Figma: 560x554 desktop, 560x554 tablet, 327x608 mobile)`,
);
console.log(
  `title   top ${data.title.top} left ${data.title.left} w ${data.title.width} h ${data.title.height}` +
    `  (Figma: top 25 left 25 w 512 h 35)`,
);
console.log(
  `desc    top ${data.description.top} left ${data.description.left} w ${data.description.width} h ${data.description.height}` +
    `  (Figma: top 76 left 25 w 512 h 23)`,
);
for (const [index, option] of data.options.entries()) {
  console.log(
    `option${index} top ${String(option.top).padStart(4)} left ${String(option.left).padStart(4)}` +
      ` w ${option.width} h ${option.height}  "${option.text}"` +
      `  (Figma: top ${115 + index * 89}, h 73)`,
  );
}
for (const button of data.buttons) {
  console.log(
    `button  top ${String(button.top).padStart(4)} left ${String(button.left).padStart(4)}` +
      ` w ${button.width} h ${button.height}  "${button.text}"`,
  );
}

ws.close();
