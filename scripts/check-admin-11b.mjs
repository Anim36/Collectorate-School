/**
 * Exercises the step 11B admin pages in the browser: the notice editor, the
 * gallery albums and approvals, the routine cell selection and the calendar
 * filters.
 *
 * Usage: node scripts/check-admin-11b.mjs [width]
 */
const width = Number(process.argv[2] ?? 1440);
const height = 2400;

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

/** Clicks the button whose label matches. */
const clickButton = (label) => `(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === ${JSON.stringify(label)}
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`;

/** The rows of the first table on the page. */
const rows = `(() => {
  const table = document.querySelector("table");
  if (!table) return [];
  return [...table.querySelectorAll("tbody tr")].map((tr) =>
    [...tr.children].map((td) => td.textContent.trim()).join(" | ")
  );
})()`;

/** The toast copy on screen. */
const toasts = `(() => {
  return [...document.querySelectorAll('[data-radix-toast], ol li')]
    .map((el) => el.textContent.trim())
    .filter(Boolean);
})()`;

console.log(`=== admin 11B behaviours @ ${width}px ===\n`);

/* ------------------------------------------------------------- notices --- */
await goto("/admin/notices");

console.log("1. the editor opens with the Figma copy");
console.log(
  "   title:",
  await evaluate(
    `[...document.querySelectorAll("input, textarea")].map((el) => el.value).filter(Boolean)[0]`,
  ),
);
console.log(
  "   audiences:",
  await evaluate(
    `[...document.querySelectorAll('input[type="checkbox"]')].map((c) => c.checked)`,
  ),
);

console.log("2. switch to the list view");
await evaluate(clickButton("List"));
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("   rows:", JSON.stringify(await evaluate(rows)));

console.log("3. publish a draft from the list");
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Publish"
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("   toast:", JSON.stringify(await evaluate(toasts)));

console.log("4. back to the editor, save a draft");
await evaluate(clickButton("Editor"));
await new Promise((resolve) => setTimeout(resolve, 700));
await evaluate(clickButton("Save draft"));
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("   toast:", JSON.stringify(await evaluate(toasts)));

console.log("5. publish the notice");
await evaluate(clickButton("Publish notice"));
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("   toast:", JSON.stringify(await evaluate(toasts)));

console.log("6. add an attachment");
const attachmentsBefore = await evaluate(
  `document.querySelectorAll("section p").length`,
);
await evaluate(clickButton("Add attachment"));
await new Promise((resolve) => setTimeout(resolve, 600));
console.log(
  "   attachment lines:",
  await evaluate(
    `[...document.querySelectorAll("section span")].map((s) => s.textContent.trim())`,
  ),
);
console.log("   before/after:", attachmentsBefore, "->");

/* ------------------------------------------------------------- gallery --- */
await goto("/admin/gallery");

console.log("7. the album list");
console.log("   rows:", JSON.stringify(await evaluate(rows)));

console.log("8. create an album");
await evaluate(clickButton("Create album"));
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("   toast:", JSON.stringify(await evaluate(toasts)));
console.log("   rows:", JSON.stringify(await evaluate(rows)));

console.log("9. open the approvals view");
await evaluate(clickButton("Approvals"));
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("   rows:", JSON.stringify(await evaluate(rows)));

console.log("10. approve the first photo");
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Approve"
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("   toast:", JSON.stringify(await evaluate(toasts)));
console.log("   rows:", JSON.stringify(await evaluate(rows)));

console.log("11. search the albums");
await evaluate(clickButton("Albums"));
await new Promise((resolve) => setTimeout(resolve, 700));
await evaluate(`(() => {
  const el = document.querySelector('input[type="search"], input[placeholder="Search albums…"]');
  if (!el) return "no input";
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value"
  ).set;
  setter.call(el, "sports");
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return "ok";
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
console.log("   rows:", JSON.stringify(await evaluate(rows)));

/* ------------------------------------------------------------- routine --- */
await goto("/admin/routine");

console.log("12. the timetable");
console.log("   rows:", JSON.stringify(await evaluate(rows)));

console.log("13. select a cell");
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("tbody button")].find(
    (b) => b.textContent.trim() === "Science"
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log(
  "   selected period:",
  await evaluate(
    `[...document.querySelectorAll("p")].map((p) => p.textContent.trim()).find((t) => t.startsWith("Sunday ·"))`,
  ),
);

console.log("14. publish the routine");
await evaluate(clickButton("Publish changes"));
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("   toast:", JSON.stringify(await evaluate(toasts)));

console.log("14b. assign a subject from the selected-period dropdown");
await evaluate(`(() => {
  const trigger = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim().startsWith("Sunday ·")
  );
  if (!trigger) return "no trigger";
  trigger.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
await evaluate(`(() => {
  const item = [...document.querySelectorAll('[role="menuitem"]')].find(
    (el) => el.textContent.trim() === "ICT"
  );
  if (!item) return "no option";
  item.click();
  return "picked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log(
  "   selected period:",
  await evaluate(
    `[...document.querySelectorAll("button")].map((b) => b.textContent.trim()).find((t) => t.startsWith("Sunday ·"))`,
  ),
);
console.log("   row:", JSON.stringify(await evaluate(rows)));

/* ------------------------------------------------------------ calendar --- */
await goto("/admin/calendar");

console.log("15. the event list");
console.log("   rows:", JSON.stringify(await evaluate(rows)));

console.log("16. filter by type");
await evaluate(`(() => {
  const trigger = document.querySelector('button[aria-label="Type"]');
  if (!trigger) return "no trigger";
  trigger.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
await evaluate(`(() => {
  const item = [...document.querySelectorAll('[role="option"]')].find(
    (el) => el.textContent.trim() === "Holiday"
  );
  if (!item) return "no option";
  item.click();
  return "picked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("   rows:", JSON.stringify(await evaluate(rows)));

console.log("17. open a row in the editor");
await evaluate(`(() => {
  const trigger = document.querySelector('button[aria-label="Type"]');
  trigger.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const item = [...document.querySelectorAll('[role="option"]')].find(
    (el) => el.textContent.trim() === "All event types"
  );
  if (!item) return "no option";
  item.click();
  return "picked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const row = document.querySelector("tbody tr");
  if (!row) return "no row";
  row.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log(
  "   event title:",
  await evaluate(
    `[...document.querySelectorAll("input")].map((i) => i.value).find((v) => v && v.length > 3)`,
  ),
);

console.log("18. save the event");
await evaluate(clickButton("Save event"));
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("   toast:", JSON.stringify(await evaluate(toasts)));
console.log("   rows:", JSON.stringify(await evaluate(rows)));

ws.close();
