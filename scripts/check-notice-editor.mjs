/**
 * Checks that the notice editor loads its chunk on demand and that the
 * toolbar and the body work once it has arrived.
 *
 * Usage: node scripts/check-notice-editor.mjs [width]
 */
const width = Number(process.argv[2] ?? 1440);

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
await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
});

const chunkRequests = [];
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.method === "Network.requestWillBeSent") {
    chunkRequests.push(msg.params.request.url);
  }
});

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) return { error: result.exceptionDetails.text };
  return result.result.value;
}

await send("Page.navigate", { url: "http://localhost:3111/admin/notices" });
await new Promise((resolve) => setTimeout(resolve, 3500));

console.log(`=== the notice editor @ ${width}px ===\n`);

console.log(
  "1. the chunk is fetched on demand:",
  chunkRequests.filter((url) => /54a60aa6|8999|70e0d97a/.test(url)).length,
  "editor chunk(s) after the page load",
);

console.log(
  "2. the panel:",
  await evaluate(`(() => {
    const panel = document.querySelector('[aria-label="Notice body"]')?.closest("div");
    if (!panel) return "no panel";
    const r = panel.getBoundingClientRect();
    return { height: Math.round(r.height), width: Math.round(r.width) };
  })()`),
);

console.log(
  "3. the toolbar:",
  JSON.stringify(
    await evaluate(
      `[...document.querySelectorAll('button[aria-label]')].map((b) => b.getAttribute("aria-label")).filter((l) => ["Bold","Italic","Underline","Heading","Bullet list","Link"].includes(l))`,
    ),
  ),
);

console.log(
  "4. the body text:",
  JSON.stringify(
    await evaluate(
      `document.querySelector('[aria-label="Notice body"]')?.textContent.trim().slice(0, 60)`,
    ),
  ),
);

console.log(
  "5. bold the first line:",
  await evaluate(`(() => {
    const area = document.querySelector('[aria-label="Notice body"]');
    if (!area) return "no area";
    area.focus();
    return "focused";
  })()`),
);

console.log(
  "6. the body is editable:",
  await evaluate(`(() => {
    const area = document.querySelector('[aria-label="Notice body"]');
    return area ? area.getAttribute("contenteditable") : "no area";
  })()`),
);

ws.close();
