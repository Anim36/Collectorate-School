/**
 * Checks that the step 11B admin pages write to the database.
 *
 * The check drives the pages in the debug browser, so it needs the server on
 * port 3111 and Chrome on the DevTools Protocol port 9222, and the browser
 * has to be signed in as an admin (see `scripts/qa/sign-in-admin.mjs`).
 *
 * The check changes rows of the school, so it puts them back the way the
 * seed describes them when it is done.
 *
 * Usage: node scripts/check-admin-11b.mjs [width]
 */

const BASE = "http://localhost:3111";

const width = Number(process.argv[2] ?? 1440);

const endpoint = await (await fetch("http://localhost:9222/json")).json();
const page = endpoint.find((target) => target.type === "page");

if (!page) {
  console.log("NO PAGE TARGET");
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve) => {
    const messageId = ++id;
    pending.set(messageId, resolve);
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });
}

ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);

  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result);
    pending.delete(message.id);
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

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });

  if (result.exceptionDetails) {
    return { error: result.exceptionDetails.text };
  }

  return result.result.value;
}

async function goto(route, wait = 1200) {
  await send("Page.navigate", { url: `${BASE}${route}` });
  await new Promise((resolve) => setTimeout(resolve, wait));
}

/** Clicks the first button whose text matches. */
const clickButton = (text) => `(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === ${JSON.stringify(text)}
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
    [...tr.children].map((td) => td.textContent.trim().replace(/\\s+/g, " ")).join(" | ")
  );
})()`;

/**
 * The toasts on the page.
 *
 * The toast is read from the region the provider puts on the page, so the
 * copy of the toast that is already on the screen is not counted twice.
 */
const toasts = `(() => {
  const live = [...document.querySelectorAll("[role=region], [role=status]")]
    .map((el) => el.textContent.trim().replace(/\\s+/g, " "))
    .filter((text) => text.length > 0 && text !== "Notifications");

  return [...new Set(live)];
})()`;

console.log(`=== admin 11B behaviours @ ${width}px ===`);

/* ------------------------------------------------------------ the notices --- */

await goto("/admin/notices", 1800);

console.log("1. the editor opens with the Figma copy");
console.log(
  "   title:",
  await evaluate(
    `[...document.querySelectorAll("textarea")].map((t) => t.value).find(Boolean)`,
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
await new Promise((resolve) => setTimeout(resolve, 900));
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
await new Promise((resolve) => setTimeout(resolve, 900));
console.log("   toast:", JSON.stringify(await evaluate(toasts)));

console.log("4. back to the editor, save a draft");
await evaluate(clickButton("Editor"));
await new Promise((resolve) => setTimeout(resolve, 900));
await evaluate(clickButton("Save draft"));
await new Promise((resolve) => setTimeout(resolve, 900));
console.log("   toast:", JSON.stringify(await evaluate(toasts)));

console.log("5. publish the notice");
await evaluate(clickButton("Publish notice"));
await new Promise((resolve) => setTimeout(resolve, 900));
console.log("   toast:", JSON.stringify(await evaluate(toasts)));

/* ------------------------------------------------------------ the gallery --- */

await goto("/admin/gallery", 1800);

console.log("6. the album list");
console.log("   rows:", JSON.stringify(await evaluate(rows)));

console.log("7. create an album");
await evaluate(clickButton("Create album"));
await new Promise((resolve) => setTimeout(resolve, 1600));
console.log("   toast:", JSON.stringify(await evaluate(toasts)));
console.log("   rows:", JSON.stringify(await evaluate(rows)));

console.log("8. open the approvals view");
await evaluate(clickButton("Approvals"));
await new Promise((resolve) => setTimeout(resolve, 900));
console.log("   rows:", JSON.stringify(await evaluate(rows)));

console.log("9. approve the first photo");
await evaluate(clickButton("Approve"));
await new Promise((resolve) => setTimeout(resolve, 1600));
console.log("   toast:", JSON.stringify(await evaluate(toasts)));
console.log("   rows:", JSON.stringify(await evaluate(rows)));

console.log("10. search the albums");
await evaluate(clickButton("Albums"));
await new Promise((resolve) => setTimeout(resolve, 900));
await evaluate(`(() => {
  const input = document.querySelector('input[type="search"], input[type="text"], input:not([type])');
  if (!input) return "no input";
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value"
  ).set;
  setter.call(input, "sports");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return "set";
})()`);
await new Promise((resolve) => setTimeout(resolve, 1400));
console.log("   rows:", JSON.stringify(await evaluate(rows)));

/* ------------------------------------------------------------ the routine --- */

await goto("/admin/routine", 1800);

console.log("11. the timetable");
console.log("   rows:", JSON.stringify(await evaluate(rows)));

console.log("12. select a cell");
await evaluate(`(() => {
  const cell = document.querySelector("tbody tr td button");
  if (!cell) return "no cell";
  cell.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log(
  "   selected period:",
  await evaluate(
    `[...document.querySelectorAll("button")].map((b) => b.textContent.trim()).find((t) => t.includes("Period"))`,
  ),
);

console.log("13. assign a subject from the selected-period dropdown");
await evaluate(`(() => {
  const trigger = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.includes("Period")
  );
  if (!trigger) return "no trigger";
  trigger.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
await evaluate(`(() => {
  const item = document.querySelector('[role="menuitem"]');
  if (!item) return "no item";
  item.click();
  return "picked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log(
  "   selected period:",
  await evaluate(
    `[...document.querySelectorAll("button")].map((b) => b.textContent.trim()).find((t) => t.includes("Period"))`,
  ),
);
console.log("   rows:", JSON.stringify(await evaluate(rows)));

console.log("14. publish the routine");
await evaluate(clickButton("Publish changes"));
await new Promise((resolve) => setTimeout(resolve, 1600));
console.log("   toast:", JSON.stringify(await evaluate(toasts)));

/* ---------------------------------------------------------- the calendar --- */

await goto("/admin/calendar", 1800);

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
await new Promise((resolve) => setTimeout(resolve, 900));
console.log("   rows:", JSON.stringify(await evaluate(rows)));

console.log("17. open a row in the editor");
await evaluate(`(() => {
  const trigger = document.querySelector('button[aria-label="Type"]');
  if (!trigger) return "no trigger";
  trigger.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
await evaluate(`(() => {
  const item = [...document.querySelectorAll('[role="option"]')].find(
    (el) => el.textContent.trim() === "All event types"
  );
  if (!item) return "no option";
  item.click();
  return "picked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
await evaluate(`(() => {
  const row = document.querySelector("tbody tr");
  if (!row) return "no row";
  row.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 900));
console.log(
  "   event title:",
  await evaluate(
    `[...document.querySelectorAll("input")].map((i) => i.value).find((v) => v && v.length > 3)`,
  ),
);

console.log("18. save the event");
await evaluate(clickButton("Save event"));
await new Promise((resolve) => setTimeout(resolve, 1200));
console.log("   toast:", JSON.stringify(await evaluate(toasts)));
console.log("   rows:", JSON.stringify(await evaluate(rows)));

ws.close();

/* --------------------------------------------------------------- cleanup --- */

// The check changed rows of the school, so they are put back the way the
// seed describes them.
const { execFileSync } = await import("node:child_process");
const { join } = await import("node:path");

console.log("");

execFileSync(
  process.execPath,
  [
    join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
    "scripts/qa/restore-seed-state.ts",
  ],
  { stdio: "inherit" },
);
