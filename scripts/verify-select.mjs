/** Opens the select dropdown and reports the palette of the portalled content. */

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
await send("Page.navigate", { url: "http://localhost:3111/design-system" });
await new Promise((resolve) => setTimeout(resolve, 3500));

const expression = `(() => {
  const triggers = Array.from(document.querySelectorAll('[role="combobox"]'));
  if (!triggers.length) return { error: 'no combobox found' };
  const trigger = triggers[0];
  const scope = trigger.closest('div.light, div.dark');
  const theme = scope ? (scope.className.includes('light') ? 'light' : 'dark') : 'none';
  trigger.click();
  return { clicked: true, theme, triggerText: trigger.textContent.trim() };
})()`;

const open = await send("Runtime.evaluate", { expression, returnByValue: true });
console.log("open:", JSON.stringify(open.result.value));

await new Promise((resolve) => setTimeout(resolve, 800));

const check = `(() => {
  const list = document.querySelector('[role="listbox"]');
  if (!list) return { error: 'no listbox' };
  const cs = getComputedStyle(list);
  const owner = list.closest('div.light, div.dark');
  const item = list.querySelector('[role="option"]');
  const itemCs = item ? getComputedStyle(item) : null;
  return {
    paletteScope: owner ? (owner.className.includes('light') ? 'light' : 'dark') : 'detached',
    bg: cs.backgroundColor,
    color: cs.color,
    radius: cs.borderRadius,
    optionColor: itemCs?.color,
    optionFontSize: itemCs?.fontSize,
    options: Array.from(list.querySelectorAll('[role="option"]')).map((o) => o.textContent.trim()).join(', '),
  };
})()`;

const result = await send("Runtime.evaluate", { expression: check, returnByValue: true });
console.log("dropdown:", JSON.stringify(result.result.value, null, 2));
ws.close();
