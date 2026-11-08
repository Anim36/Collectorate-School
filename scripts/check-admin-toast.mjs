/**
 * Checks that the admin actions raise a toast.
 *
 * Usage: node scripts/check-admin-toast.mjs
 */
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
  width: 1440,
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3111/admin/users" });
await new Promise((resolve) => setTimeout(resolve, 2000));

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result.value;
}

await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Deactivate"
  );
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const btn = [...document.querySelectorAll('[role="dialog"] button')].find(
    (b) => b.textContent.trim() === "Deactivate"
  );
  btn.click();
  return "confirmed";
})()`);
await new Promise((resolve) => setTimeout(resolve, 800));

console.log(
  "toast region:",
  JSON.stringify(
    await evaluate(
      `(() => {
         const vp = document.querySelector('[data-radix-toast-viewport], [role="region"], ol');
         if (!vp) return "no viewport";
         return {
           html: vp.outerHTML.slice(0, 400),
           text: vp.textContent.trim(),
         };
       })()`,
    ),
  ),
);

console.log(
  "all toasts:",
  JSON.stringify(
    await evaluate(
      `[...document.querySelectorAll('[data-radix-toast], li')].map(e=>e.textContent.trim()).filter(Boolean)`,
    ),
  ),
);

ws.close();
