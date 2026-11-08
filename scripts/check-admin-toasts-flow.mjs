/**
 * Checks the admin toasts: add user, deactivate, activate, reset password.
 *
 * Usage: node scripts/check-admin-toasts-flow.mjs
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
await send("Page.navigate", { url: "http://localhost:3111/admin/users" });
await new Promise((resolve) => setTimeout(resolve, 2200));

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result.value;
}

/** The toast that is on screen, if any. */
const toast = `(() => {
  const vp = document.querySelector('[data-radix-toast-viewport], [role="region"], ol');
  if (!vp) return null;
  const text = vp.textContent.trim();
  if (!text) return null;
  const el = vp.querySelector('[data-state], li');
  return {
    state: el?.getAttribute('data-state') ?? null,
    text,
  };
})()`;

/** The status cell of the first row of the table. */
const firstRowStatus = `(() => {
  const tr = document.querySelector('table tbody tr');
  return tr ? [...tr.children].map((td) => td.textContent.trim()) : null;
})()`;

const clickButton = (label) => `(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === ${JSON.stringify(label)}
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`;

/** The confirming button inside the open dialog. */
const clickDialogButton = (label) => `(() => {
  const btn = [...document.querySelectorAll('[role="dialog"] button')].find(
    (b) => b.textContent.trim() === ${JSON.stringify(label)}
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`;

console.log("initial toast:", JSON.stringify(await evaluate(toast)));
console.log("initial row:  ", JSON.stringify(await evaluate(firstRowStatus)));

console.log("\n-- deactivate the first row --");
await evaluate(clickButton("Deactivate"));
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("  dialog:", await evaluate(
  `document.querySelector('[role="dialog"] h2')?.textContent.trim() ?? "no dialog"`,
));
await evaluate(clickDialogButton("Deactivate"));
await new Promise((resolve) => setTimeout(resolve, 800));
console.log("  toast: ", JSON.stringify(await evaluate(toast)));
console.log("  row:   ", JSON.stringify(await evaluate(firstRowStatus)));

console.log("\n-- activate the first row again --");
await evaluate(clickButton("Activate"));
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("  dialog:", await evaluate(
  `document.querySelector('[role="dialog"] h2')?.textContent.trim() ?? "no dialog"`,
));
await evaluate(clickDialogButton("Activate"));
await new Promise((resolve) => setTimeout(resolve, 800));
console.log("  toast: ", JSON.stringify(await evaluate(toast)));
console.log("  row:   ", JSON.stringify(await evaluate(firstRowStatus)));

console.log("\n-- reset the password of the first row --");
await evaluate(clickButton("Reset password"));
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("  dialog:", await evaluate(
  `document.querySelector('[role="dialog"] h2')?.textContent.trim() ?? "no dialog"`,
));
await evaluate(clickDialogButton("Reset password"));
await new Promise((resolve) => setTimeout(resolve, 800));
console.log("  toast: ", JSON.stringify(await evaluate(toast)));

console.log("\n-- add a user --");
await evaluate(clickButton("Add User"));
await new Promise((resolve) => setTimeout(resolve, 700));

const setLabelled = (label, value) => `(() => {
  const el = [...document.querySelectorAll("label")]
    .find((l) => l.textContent.trim() === ${JSON.stringify(label)})
    ?.getAttribute("for");
  if (!el) return "no label";
  const input = document.getElementById(el);
  if (!input) return "no input";
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value"
  ).set;
  setter.call(input, ${JSON.stringify(value)});
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return "ok";
})()`;

await evaluate(setLabelled("Full name", "Sadia Rahman"));
await evaluate(setLabelled("Email", "sadia.rahman@example.com"));
await evaluate(setLabelled("Temporary password", "School@2026!Change"));
await new Promise((resolve) => setTimeout(resolve, 400));
await evaluate(`(() => {
  document.querySelector('button[aria-label="Class and section"]').click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const item = [...document.querySelectorAll('[role="option"]')].find(
    (el) => el.textContent.trim() === "Class 9 · A"
  );
  item.click();
  return "picked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 400));
await evaluate(`(() => {
  document.querySelector("#admin-add-user").requestSubmit();
  return "submitted";
})()`);
await new Promise((resolve) => setTimeout(resolve, 900));
console.log("  dialog closed:", await evaluate(`document.querySelector('[role="dialog"]') === null`));
console.log("  toast: ", JSON.stringify(await evaluate(toast)));
console.log("  row:   ", JSON.stringify(await evaluate(firstRowStatus)));

console.log("\n-- the classes page toasts --");
await send("Page.navigate", { url: "http://localhost:3111/admin/classes" });
await new Promise((resolve) => setTimeout(resolve, 2200));

await evaluate(clickButton("Add class"));
await new Promise((resolve) => setTimeout(resolve, 700));
await evaluate(`(() => {
  const input = document.querySelector("#admin-class-name");
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value"
  ).set;
  setter.call(input, "Class 11");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return "ok";
})()`);
await new Promise((resolve) => setTimeout(resolve, 300));
await evaluate(`(() => {
  document.querySelector("#admin-class-teacher").click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const item = [...document.querySelectorAll('[role="option"]')].find(
    (el) => el.textContent.trim() === "Farhana Akter"
  );
  item.click();
  return "picked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 400));
await evaluate(`(() => {
  document.querySelector("#admin-class").requestSubmit();
  return "submitted";
})()`);
await new Promise((resolve) => setTimeout(resolve, 900));
console.log("  toast: ", JSON.stringify(await evaluate(toast)));
console.log(
  "  class rows:",
  await evaluate(`document.querySelectorAll('table')[0].querySelectorAll('tbody tr').length`),
);

ws.close();
