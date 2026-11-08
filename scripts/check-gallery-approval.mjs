/**
 * Checks how the teacher gallery uploads and the admin approval queue relate:
 * does a photo the teacher stages reach the admin queue, and does approving a
 * photo in the admin queue change the teacher gallery?
 *
 * Usage: node scripts/check-gallery-approval.mjs [width]
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

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
await send("DOM.enable");
await send("Runtime.enable");
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

async function goto(route) {
  await send("Page.navigate", { url: `http://localhost:3111${route}` });
  await new Promise((resolve) => setTimeout(resolve, 2200));
}

/** The rows of the first table on the page. */
const rows = `(() => {
  const table = document.querySelector("table");
  if (!table) return [];
  return [...table.querySelectorAll("tbody tr")].map((tr) =>
    [...tr.children].map((td) => td.textContent.trim()).join(" | ")
  );
})()`;

/** The badges on the page. */
const badges = `(() =>
  [...document.querySelectorAll("span")]
    .map((s) => s.textContent.trim())
    .filter((t) => t === "Awaiting admin approval" || t === "Approved" || t === "Ready")
)()`;

console.log(`=== the gallery approval flow @ ${width}px ===\n`);

/* --------------------------------------------------- the teacher stages --- */

console.log("1. the teacher gallery before the upload");
await goto("/teacher/gallery");
console.log("   rows:", JSON.stringify(await evaluate(rows)));
console.log("   badges:", JSON.stringify(await evaluate(badges)));

const imagePath = path.join(os.tmpdir(), "teacher-upload.jpg");
if (!fs.existsSync(imagePath)) {
  fs.copyFileSync("public/images/science-fair.jpg", imagePath);
}

const doc = await send("DOM.getDocument", { depth: -1 });
const input = await send("DOM.querySelector", {
  nodeId: doc.root.nodeId,
  selector: 'input[type="file"]',
});
await send("DOM.setFileInputFiles", {
  nodeId: input.nodeId,
  files: [imagePath],
});
await new Promise((resolve) => setTimeout(resolve, 1200));

console.log("\n2. after the teacher stages a photo");
console.log("   rows:", JSON.stringify(await evaluate(rows)));
console.log("   badges:", JSON.stringify(await evaluate(badges)));

/* ------------------------------------------------------- the admin queue --- */

console.log("\n3. the admin approval queue");
await goto("/admin/gallery");
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Approvals"
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 800));
console.log("   rows:", JSON.stringify(await evaluate(rows)));
console.log("   badges:", JSON.stringify(await evaluate(badges)));

console.log("\n4. approve the first photo in the admin queue");
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Approve"
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 800));
console.log("   rows:", JSON.stringify(await evaluate(rows)));
console.log("   badges:", JSON.stringify(await evaluate(badges)));

/* ------------------------------------------------ back to the teacher view --- */

console.log("\n5. back to the teacher gallery");
await goto("/teacher/gallery");
console.log("   rows:", JSON.stringify(await evaluate(rows)));
console.log("   badges:", JSON.stringify(await evaluate(badges)));

ws.close();
