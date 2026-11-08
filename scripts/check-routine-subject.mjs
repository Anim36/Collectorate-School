/**
 * Opens the routine "Selected period" dropdown with a real mouse click and
 * picks a subject, so the Radix menu is exercised the way a reader would.
 *
 * Usage: node scripts/check-routine-subject.mjs
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
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3111/admin/routine" });
await new Promise((resolve) => setTimeout(resolve, 2500));

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) return { error: result.exceptionDetails.text };
  return result.result.value;
}

/** Clicks the element at the centre of the given point. */
async function clickAt(x, y) {
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
}

const trigger = await evaluate(`(() => {
  const button = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim().startsWith("Sunday ·")
  );
  if (!button) return null;
  const r = button.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
})()`);

if (!trigger) {
  console.log("TRIGGER NOT FOUND");
  ws.close();
  process.exit(1);
}

await clickAt(trigger.x, trigger.y);
await new Promise((resolve) => setTimeout(resolve, 700));

console.log(
  "menu:",
  JSON.stringify(
    await evaluate(`(() => {
      const panel = document.querySelector('[data-radix-popper-content-wrapper]');
      if (!panel) return "no panel";
      return {
        state: panel.firstElementChild?.getAttribute("data-state"),
        items: [...panel.querySelectorAll('[role="menuitem"]')].map(
          (item) => item.textContent.trim()
        ),
      };
    })()`),
  ),
);

const option = await evaluate(`(() => {
  const item = [...document.querySelectorAll('[role="menuitem"]')].find(
    (el) => el.textContent.trim() === "ICT"
  );
  if (!item) return null;
  const r = item.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
})()`);

if (!option) {
  console.log("OPTION NOT FOUND");
  ws.close();
  process.exit(1);
}

await clickAt(option.x, option.y);
await new Promise((resolve) => setTimeout(resolve, 700));

console.log(
  "selected period:",
  await evaluate(
    `[...document.querySelectorAll("button")].map((b) => b.textContent.trim()).find((t) => t.startsWith("Sunday ·"))`,
  ),
);

console.log(
  "row:",
  JSON.stringify(
    await evaluate(`(() => {
      const row = document.querySelector("tbody tr");
      if (!row) return null;
      return [...row.children].map((td) => td.textContent.trim());
    })()`),
  ),
);

ws.close();
