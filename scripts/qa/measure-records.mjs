/**
 * Reports the geometry of the stacked records a table draws on mobile.
 *
 * Usage: node scripts/qa/measure-records.mjs <route> <width> [tableIndex]
 */
const route = process.argv[2] ?? "/admin/fees";
const width = Number(process.argv[3] ?? 375);
const tableIndex = Number(process.argv[4] ?? 1);

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
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
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

await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2600));

console.log(
  JSON.stringify(
    await evaluate(`(() => {
      const lists = [...document.querySelectorAll("ul")].filter(
        (ul) => ul.className.includes("md:hidden") && ul.children.length,
      );
      const list = lists[${tableIndex}];
      if (!list) return "no record list";

      const records = [...list.children].map((li) => {
        const r = li.getBoundingClientRect();
        return {
          h: Math.round(r.height),
          lines: [...li.children].map((p) => {
            const pr = p.getBoundingClientRect();
            return {
              text: p.textContent.trim().slice(0, 46),
              h: Math.round(pr.height),
            };
          }),
        };
      });

      const footer = list.nextElementSibling;
      const box = list.parentElement.getBoundingClientRect();

      return {
        records,
        footerText: footer ? footer.textContent.trim().slice(0, 40) : null,
        footerTop: footer ? Math.round(footer.getBoundingClientRect().top - box.top) : null,
        tableHeight: Math.round(box.height),
      };
    })()`),
    null,
    1,
  ),
);

ws.close();
