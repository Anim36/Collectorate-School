/**
 * Runs a sequence of expressions in the debug browser, one after the other,
 * and prints the result of each. It is used to drive a page through a few
 * steps that the compare script cannot express on its own.
 *
 * Usage: node scripts/qa/run-steps.mjs <route> <width> <step.js> [step.js ...]
 */
const route = process.argv[2] ?? "/teacher/results";
const width = Number(process.argv[3] ?? 1440);
const steps = process.argv.slice(4);

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
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

const { readFileSync } = await import("node:fs");

for (const step of steps) {
  const expression = readFileSync(step, "utf8");
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });

  const value = result.exceptionDetails
    ? `ERROR: ${result.exceptionDetails.text}`
    : result.result.value;

  console.log(`--- ${step}`);
  console.log(typeof value === "string" ? value : JSON.stringify(value, null, 2));
  await new Promise((resolve) => setTimeout(resolve, 900));
}

ws.close();
