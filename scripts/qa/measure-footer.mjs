/**
 * Prints the rendered geometry of the footer columns and the footer's
 * children so the footer can be matched to the Figma frame.
 */

const width = Number(process.argv[2] ?? 375);

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
  height: 800,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3111/" });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const footer = document.querySelector('footer');
  const fr = footer.getBoundingClientRect();
  const cols = Array.from(footer.querySelectorAll(':scope > div > div > div')).map((el) => {
    const r = el.getBoundingClientRect();
    return {
      text: (el.textContent || '').trim().slice(0, 24),
      top: Math.round(r.top - fr.top),
      h: Math.round(r.height),
      w: Math.round(r.width),
    };
  });
  const legal = footer.querySelector(':scope > div > p');
  const lr = legal.getBoundingClientRect();
  return {
    footerH: Math.round(fr.height),
    padY: getComputedStyle(footer).paddingTop,
    gap: getComputedStyle(footer.querySelector(':scope > div')).gap,
    cols,
    legal: { top: Math.round(lr.top - fr.top), h: Math.round(lr.height) },
  };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log(`viewport ${width}`);
console.log(JSON.stringify(result.result.value, null, 2));
ws.close();
