/**
 * Runs a CSS experiment in the rendered page and reports the resulting
 * table row geometry.
 *
 * Usage: node scripts/qa/experiment.mjs <route> <width> <selector> <patchFile>
 */
import fs from "node:fs";

const route = process.argv[2] ?? "/notice";
const width = Number(process.argv[3] ?? 1440);
const height = Number(process.argv[4] ?? 1200);
const selector = process.argv[5] ?? "table";
const patchFile = process.argv[6] ?? "";

const patch = patchFile ? fs.readFileSync(patchFile, "utf8") : "";

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
  height,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const root = document.querySelector(${JSON.stringify(selector)});
  if (!root) return null;
  ${patch}
  const rows = Array.from(root.querySelectorAll("tr")).map((tr) => {
    const r = tr.getBoundingClientRect();
    return {
      tag: tr.parentElement.tagName.toLowerCase(),
      top: Math.round((r.top + window.scrollY) * 10) / 10,
      height: Math.round(r.height * 10) / 10,
    };
  });
  return { rows };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

const actual = result.result.value;
if (result.exceptionDetails) {
  console.log(`EXCEPTION: ${result.exceptionDetails.text}`);
  const exception = result.exceptionDetails.exception;
  if (exception) console.log(exception.description ?? exception.value);
}
if (!actual) {
  console.log("NO MATCH");
} else {
  let prevBottom = null;
  for (const row of actual.rows) {
    const gap = prevBottom === null ? "" : row.top - prevBottom;
    console.log(
      `  ${row.tag.padEnd(6)} top ${String(row.top).padStart(7)} h ${String(row.height).padStart(6)} gapAbove=${String(gap).padStart(6)}`,
    );
    prevBottom = row.top + row.height;
  }
}

ws.close();
