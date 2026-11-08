/**
 * Measures the rendered width of the 9C page blocks, so they can be compared
 * with the Figma frames (the student notice table and the "No unread notices"
 * panel are both 1136px wide inside the 1440px frame).
 *
 * Usage: node scripts/qa/measure-9c-widths.mjs
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

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true });
  return result.result.value;
};

for (const width of [1440, 768, 375]) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false,
  });

  for (const route of ["/student/notice", "/student/gallery"]) {
    await send("Page.navigate", { url: `http://localhost:3111${route}` });
    await new Promise((resolve) => setTimeout(resolve, 2200));

    const data = await evaluate(`(() => {
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          left: Math.round(r.left),
          width: Math.round(r.width),
          height: Math.round(r.height),
        };
      };
      const content = document.querySelector('main [data-portal="content"]') ||
        document.querySelector('main > div');
      return {
        content: box(content),
        panels: Array.from(document.querySelectorAll('main > div > div'))
          .filter((el) => el.getBoundingClientRect().width > 0)
          .map(box),
        table: box(document.querySelector('main table')),
        sections: Array.from(document.querySelectorAll('main section')).map(box),
      };
    })()`);

    console.log(`\n=== ${route} @ ${width} ===`);
    console.log("content :", JSON.stringify(data.content));
    for (const panel of data.panels) {
      console.log("  panel :", JSON.stringify(panel));
    }
    console.log("table   :", JSON.stringify(data.table));
    for (const section of data.sections) {
      console.log("  section:", JSON.stringify(section));
    }
  }
}

ws.close();
