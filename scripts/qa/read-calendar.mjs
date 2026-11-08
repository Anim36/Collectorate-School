/**
 * Reports the day number and status letter of every cell in the rendered
 * attendance calendar, so it can be compared with Figma.
 *
 * Usage: node scripts/qa/read-calendar.mjs [route] [width]
 */
const route = process.argv[2] ?? "/student/attendance";
const width = Number(process.argv[3] ?? 1440);

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
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const grid = document.querySelector('main > div > div:nth-child(4) > div:nth-child(2)');
  if (!grid) return null;
  const cells = Array.from(grid.querySelectorAll('div > div')).filter((cell) =>
    cell.querySelector('span'),
  );
  return cells.map((cell) => {
    const spans = Array.from(cell.querySelectorAll('span'));
    const day = spans[0] ? spans[0].textContent.trim() : '';
    const status = spans[1] ? spans[1].textContent.trim().split(' ')[0] : '';
    return day + '\t' + status;
  });
})()`;

const result = await send("Runtime.evaluate", { expression, returnByValue: true });

for (const row of result.result.value ?? []) {
  console.log(row);
}

ws.close();
