/**
 * Measures how wide a string is at a range of font sizes, in the font of the
 * element it would be set in.
 *
 * Usage: node scripts/qa/measure-name-width.mjs <route> <selector> [text]
 */
const route = process.argv[2] ?? "/";
const selector = process.argv[3] ?? "header > div > a > span:first-child";
const text = process.argv[4] ?? "Narail Collectorate School";

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
    const messageId = ++id;
    pending.set(messageId, resolve);
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });
}

ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result);
    pending.delete(message.id);
  }
});

await new Promise((resolve) => ws.addEventListener("open", resolve));
await send("Page.enable");
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2200));

const expression = `(() => {
  const probe = document.querySelector(${JSON.stringify(selector)});
  if (!probe) return null;
  const cs = getComputedStyle(probe);
  const clone = probe.cloneNode(false);
  clone.textContent = ${JSON.stringify(text)};
  clone.style.position = 'fixed';
  clone.style.top = '0';
  clone.style.left = '0';
  clone.style.visibility = 'hidden';
  clone.style.whiteSpace = 'nowrap';
  clone.style.width = 'max-content';
  clone.style.maxWidth = 'none';
  clone.style.display = 'block';
  document.body.appendChild(clone);

  const widths = {};
  for (const size of [13, 14, 15, 16, 17, 18, 19, 20, 22, 24]) {
    clone.style.fontSize = size + 'px';
    widths[size] = Math.round(clone.getBoundingClientRect().width);
  }

  clone.remove();
  return { font: cs.fontWeight + ' ' + cs.fontFamily, widths };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log(JSON.stringify(result.result.value, null, 1));

ws.close();
