/**
 * Confirms the empty state renders when no staff match the filters.
 *
 * Usage: node scripts/check-empty.mjs
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

await send("Runtime.evaluate", {
  expression: `(() => {
    const input = document.querySelector('input[type="search"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'zzzz');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`,
  returnByValue: true,
});
await new Promise((resolve) => setTimeout(resolve, 700));

const result = await send("Runtime.evaluate", {
  expression: `(() => {
    const main = document.querySelector('main');
    const text = main.innerText;
    return {
      hasNoMatchText: /no staff match your search/i.test(text),
      snippet: text.slice(text.indexOf('No matching'), text.indexOf('No matching') + 90),
      cards: document.querySelectorAll('main ul li article').length,
    };
  })()`,
  returnByValue: true,
});

console.log(JSON.stringify(result.result.value, null, 2));
ws.close();
