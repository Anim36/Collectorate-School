/**
 * Checks that the users pagination count is computed from the filtered data.
 *
 * Usage: node scripts/check-users-pagination.mjs
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

/** The count line and the page controls. */
const state = `(() => {
  const nav = document.querySelector('nav[aria-label="Pagination"]');
  const summary = nav?.parentElement?.querySelector('p')?.textContent.trim();
  const pages = [...(nav?.querySelectorAll('button') ?? [])]
    .map((b) => b.textContent.trim())
    .filter((t) => /^\\d+$/.test(t));
  const rows = document.querySelectorAll('table tbody tr').length;
  return { summary, pages, rows };
})()`;

const setInput = (selector, value) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return "no input";
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value"
  ).set;
  setter.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return "ok";
})()`;

const pickRole = () => `(() => {
  const trigger = document.querySelector('[role="combobox"]');
  trigger.click();
  return "clicked";
})()`;

console.log("unfiltered: ", JSON.stringify(await evaluate(state)));

await evaluate(setInput('input[type="search"]', "Nusrat"));
await new Promise((resolve) => setTimeout(resolve, 500));
console.log("search Nusrat:", JSON.stringify(await evaluate(state)));

await evaluate(setInput('input[type="search"]', "zzzznomatch"));
await new Promise((resolve) => setTimeout(resolve, 500));
console.log("no match:    ", JSON.stringify(await evaluate(state)));

await evaluate(setInput('input[type="search"]', ""));
await new Promise((resolve) => setTimeout(resolve, 400));

await evaluate(pickRole());
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const item = [...document.querySelectorAll('[role="option"]')].find(
    (el) => el.textContent.trim() === "Teacher"
  );
  if (!item) return "no option";
  item.click();
  return "picked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("role Teacher: ", JSON.stringify(await evaluate(state)));

// Back to all roles.
await evaluate(pickRole());
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const item = [...document.querySelectorAll('[role="option"]')].find(
    (el) => el.textContent.trim() === "All roles"
  );
  if (!item) return "no option";
  item.click();
  return "picked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("all roles:    ", JSON.stringify(await evaluate(state)));

// Walk to the last page and read the count again.
await evaluate(`(() => {
  const nav = document.querySelector('nav[aria-label="Pagination"]');
  const last = [...nav.querySelectorAll('button')].filter((b) => /^\\d+$/.test(b.textContent.trim())).pop();
  last.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("last page:    ", JSON.stringify(await evaluate(state)));

ws.close();
