/**
 * Reports the console errors and the failed requests of a route, so a page that
 * renders but breaks in the browser is caught.
 *
 * Usage: node scripts/check-console.mjs <route> [width]
 */
const route = process.argv[2] ?? "/admin/notices";
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
const problems = [];

function send(method, params = {}) {
  return new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);

  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    problems.push(
      `console.error: ${msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ")}`,
    );
  }

  if (msg.method === "Runtime.exceptionThrown") {
    problems.push(
      `exception: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`,
    );
  }

  if (msg.method === "Network.loadingFailed") {
    problems.push(`request failed: ${msg.params.errorText}`);
  }

  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
});

await new Promise((resolve) => ws.addEventListener("open", resolve));
await send("Runtime.enable");
await send("Log.enable");
await send("Network.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 3000));

console.log(`=== ${route} @ ${width}px ===`);
console.log(
  problems.length === 0
    ? "no console errors, exceptions or failed requests"
    : problems.join("\n"),
);

ws.close();
