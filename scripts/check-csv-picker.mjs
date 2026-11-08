/**
 * Checks the CSV file picker: a picked file fills the preview table.
 *
 * Usage: node scripts/check-csv-picker.mjs
 */
import fs from "node:fs";
import path from "node:path";

const fixture = path.resolve(".tmp-step11a-accounts.csv");
fs.writeFileSync(
  fixture,
  [
    "Name,Role,Class,Email",
    "Jahanara Begum,Student,Class 10 A,jahanara.begum@example.com",
    "Rafiqul Islam,Teacher,Mathematics,rafiqul.islam@example.com",
    "Nusrat Jahan,Student,Class 9 A,",
    "",
  ].join("\n"),
);

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
  width: 1440,
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3111/admin/users" });
await new Promise((resolve) => setTimeout(resolve, 2200));

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result.value;
}

// Open the import panel.
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Bulk CSV import"
  );
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));

// The file input is a hidden input, so it is driven through the DOM.
const document_ = await send("DOM.getDocument", { depth: -1 });
const input = await send("DOM.querySelector", {
  nodeId: document_.root.nodeId,
  selector: 'input[type="file"]',
});

await send("DOM.setFileInputFiles", {
  nodeId: input.nodeId,
  files: [fixture],
});
await new Promise((resolve) => setTimeout(resolve, 900));

console.log(
  "file line:",
  await evaluate(
    `(() => {
       const p = [...document.querySelectorAll("p")].map((el) => el.textContent.trim());
       return p.find((t) => t.includes(".csv")) ?? "no file line";
     })()`,
  ),
);

console.log(
  "preview rows:",
  JSON.stringify(
    await evaluate(
      `(() => {
         const tables = [...document.querySelectorAll("table")];
         return tables.map((t) => t.querySelectorAll("tbody tr").length);
       })()`,
    ),
  ),
);

// The review table lists the rows the browser read out of the file.
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Review import"
  );
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));

console.log(
  "review table:",
  JSON.stringify(
    await evaluate(
      `(() => {
         const tables = [...document.querySelectorAll("table")];
         const t = tables[tables.length - 1];
         return {
           rows: t.querySelectorAll("tbody tr").length,
           headers: [...t.querySelectorAll("th")].map((h) => h.textContent.trim()),
           body: [...t.querySelectorAll("tbody tr")].map((tr) =>
             [...tr.children].map((td) => td.textContent.trim())
           ),
         };
       })()`,
    ),
  ),
);

ws.close();
fs.rmSync(fixture, { force: true });
