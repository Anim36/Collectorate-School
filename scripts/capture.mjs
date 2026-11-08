/**
 * Captures a full-page screenshot of a route through the running browser.
 *
 * Usage: node scripts/capture.mjs <route> <width> <outFile> [theme]
 */
import fs from "node:fs";

const route = process.argv[2] ?? "/student/performance";
const width = Number(process.argv[3] ?? 1440);
const outFile = process.argv[4] ?? "figma-tmp/shot.png";
const theme = process.argv[5] ?? "light";

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
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 1500));
await send("Runtime.evaluate", {
  expression: `localStorage.setItem('theme', '${theme}')`,
});
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

const height = await send("Runtime.evaluate", {
  expression: "Math.ceil(document.documentElement.scrollHeight)",
  returnByValue: true,
});
const pageHeight = Math.min(Math.ceil(height.result.value), 6000);

await send("Emulation.setDeviceMetricsOverride", {
  width,
  height: pageHeight,
  deviceScaleFactor: 1,
  mobile: false,
});
await new Promise((resolve) => setTimeout(resolve, 1200));

const shot = await send("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: true,
});
const data = shot.result?.data ?? shot.data;
if (!data) {
  console.log("NO SCREENSHOT DATA", JSON.stringify(shot).slice(0, 300));
  process.exit(1);
}

fs.mkdirSync(outFile.split(/[\\/]/).slice(0, -1).join("/") || ".", {
  recursive: true,
});
fs.writeFileSync(outFile, Buffer.from(data, "base64"));
console.log(`saved ${outFile} (${width}x${pageHeight})`);

ws.close();
