/**
 * Drives the /teachers filters in the live browser: types into the search
 * field, switches tabs, picks a subject and reports the resulting card list.
 *
 * Usage: node scripts/check-filters.mjs
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
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3111/teachers" });
await new Promise((resolve) => setTimeout(resolve, 2500));

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true });
  return result.result.value;
};

const stateExpression = `(() => {
  const cards = Array.from(document.querySelectorAll('main ul li article'));
  const tabs = Array.from(document.querySelectorAll('[role="tab"]')).map((t) => ({
    label: t.textContent.trim(),
    selected: t.getAttribute('aria-selected') === 'true',
  }));
  const empty = document.querySelector('main [data-empty-state], main h3');
  return {
    count: cards.length,
    names: cards.map((c) => c.querySelector('h3')?.textContent.trim()).filter(Boolean),
    tabs,
    inputValue: document.querySelector('input[type="search"]')?.value ?? null,
    selectValue: document.querySelector('[role="combobox"]')?.textContent.trim() ?? null,
    emptyVisible: Boolean(empty && /no staff/i.test(empty.textContent ?? "")),
  };
})()`;

console.log("initial:", JSON.stringify(await evaluate(stateExpression), null, 2));

// 1. Search by name.
await evaluate(`(() => {
  const input = document.querySelector('input[type="search"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, 'nusrat');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
console.log("\nsearch 'nusrat':", JSON.stringify(await evaluate(stateExpression), null, 2));

// 2. Clear the search and switch to the Officers tab.
await evaluate(`(() => {
  const input = document.querySelector('input[type="search"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, '');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 400));
await evaluate(`(() => {
  const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => t.textContent.trim() === 'Officers');
  tab.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
console.log("\ntab 'Officers':", JSON.stringify(await evaluate(stateExpression), null, 2));

// 3. Support Staff tab.
await evaluate(`(() => {
  const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => t.textContent.trim() === 'Support Staff');
  tab.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
console.log("\ntab 'Support Staff':", JSON.stringify(await evaluate(stateExpression), null, 2));

// 4. Subject filter on the Teachers tab.
await evaluate(`(() => {
  const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => t.textContent.trim() === 'Teachers');
  tab.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 500));
await evaluate(`(() => {
  const trigger = document.querySelector('[role="combobox"]');
  trigger.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
const options = await evaluate(`Array.from(document.querySelectorAll('[role="option"]')).map((o) => o.textContent.trim())`);
console.log("\nsubject options:", JSON.stringify(options));

await evaluate(`(() => {
  const option = Array.from(document.querySelectorAll('[role="option"]')).find((o) => o.textContent.trim() === 'Science');
  option.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("\nsubject 'Science':", JSON.stringify(await evaluate(stateExpression), null, 2));

// 5. No-match case.
await evaluate(`(() => {
  const input = document.querySelector('input[type="search"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, 'zzzz');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("\nno match:", JSON.stringify(await evaluate(stateExpression), null, 2));

ws.close();
