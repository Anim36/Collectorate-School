/**
 * Measures how wide a string renders at a given font size and weight, so a
 * Figma text box can be matched against the page.
 *
 * Usage: node scripts/qa/probe-text.mjs <text> <maxWidth> [sizes]
 */
const text = process.argv[2] ?? "No notices match your filters";
const maxWidth = Number(process.argv[3] ?? 279);
const sizes = (process.argv[4] ?? "16,18,20").split(",").map(Number);

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

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) return { error: result.exceptionDetails.text };
  return result.result.value;
}

await send("Page.navigate", { url: "http://localhost:3111/" });
await new Promise((resolve) => setTimeout(resolve, 1800));

console.log(
  JSON.stringify(
    await evaluate(`(() => {
      const probe = document.createElement("span");
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      probe.style.whiteSpace = "nowrap";
      probe.style.left = "-9999px";
      probe.style.fontFamily = getComputedStyle(document.body).fontFamily;
      probe.textContent = ${JSON.stringify(text)};
      document.body.appendChild(probe);

      const out = ${JSON.stringify(sizes)}.map((size) => {
        const row = { size, maxWidth: ${maxWidth} };
        for (const weight of [400, 500, 600, 700]) {
          probe.style.fontSize = size + "px";
          probe.style.fontWeight = String(weight);
          const width = Math.round(probe.getBoundingClientRect().width);
          row["w" + weight] = width + (width <= ${maxWidth} ? "" : " !");
        }
        return row;
      });

      probe.remove();
      return out;
    })()`),
    null,
    1,
  ),
);

ws.close();
