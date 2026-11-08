/**
 * Checks the resolved colour tokens and the dark-mode section backgrounds
 * of the rendered home page against the Figma dark palette.
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
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3111/" });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const root = document.documentElement;
  const read = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  const tokens = {};
  for (const name of ['--background','--surface','--primary','--ink','--muted','--border','--tint','--navy','--action','--white']) {
    tokens[name] = read(name);
  }
  const sections = Array.from(document.querySelectorAll('main > *')).map((el) => ({
    h: Math.round(el.getBoundingClientRect().height),
    bg: getComputedStyle(el).backgroundColor,
  }));
  return { tokens, sections };
})()`;

const lightResult = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log("--- light ---");
console.log(JSON.stringify(lightResult.result.value.tokens, null, 2));
console.log(
  JSON.stringify(
    lightResult.result.value.sections.map((s) => `${s.h} ${s.bg}`),
    null,
    2,
  ),
);

// Flip to dark and re-read.
await send("Runtime.evaluate", {
  expression: `(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    return true;
  })()`,
  returnByValue: true,
});
await new Promise((resolve) => setTimeout(resolve, 400));

const darkResult = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

console.log("--- dark ---");
console.log(JSON.stringify(darkResult.result.value.tokens, null, 2));
console.log(
  JSON.stringify(
    darkResult.result.value.sections.map((s) => `${s.h} ${s.bg}`),
    null,
    2,
  ),
);

ws.close();
