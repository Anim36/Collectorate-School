/**
 * Drives the student notice filters and the album lightbox in the live browser:
 * types into the search field, picks a category, narrows the date range and
 * opens a photograph in the lightbox.
 *
 * Usage: node scripts/check-9c-interactions.mjs
 */
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
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true });
  return result.result.value;
};

const noticeState = `(() => {
  const rows = Array.from(document.querySelectorAll('main table tbody tr'));
  const records = Array.from(document.querySelectorAll('main ul li'));
  const links = Array.from(document.querySelectorAll('main table tbody a'))
    .map((a) => a.textContent.trim());
  const footer = Array.from(document.querySelectorAll('main p'))
    .map((p) => p.textContent.trim())
    .find((t) => /^Showing/.test(t));
  return {
    tableRows: rows.length,
    mobileRecords: records.length,
    links,
    footer,
    searchValue: document.querySelector('input[type="search"]')?.value ?? null,
  };
})()`;

const setSearch = (value) => `(() => {
  const input = document.querySelector('input[type="search"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, ${JSON.stringify(value)});
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`;

// ---------------------------------------------------------------- Notice page
await send("Page.navigate", { url: "http://localhost:3111/student/notice" });
await new Promise((resolve) => setTimeout(resolve, 2500));

console.log("notice initial:", JSON.stringify(await evaluate(noticeState)));

// 1. Search for a student-only notice.
await evaluate(setSearch("continuous assessment"));
await new Promise((resolve) => setTimeout(resolve, 600));
console.log("\nsearch 'continuous assessment':", JSON.stringify(await evaluate(noticeState)));

// 2. Search that matches nothing.
await evaluate(setSearch("zzzz"));
await new Promise((resolve) => setTimeout(resolve, 600));
console.log("\nsearch 'zzzz':", JSON.stringify(await evaluate(noticeState)));

// 3. Clear and pick a category from the dropdown.
await evaluate(setSearch(""));
await new Promise((resolve) => setTimeout(resolve, 400));
await evaluate(`(() => {
  const trigger = document.querySelector('[role="combobox"]');
  trigger.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
const options = await evaluate(
  `Array.from(document.querySelectorAll('[role="option"]')).map((o) => o.textContent.trim())`,
);
console.log("\ncategory options:", JSON.stringify(options));

await evaluate(`(() => {
  const option = Array.from(document.querySelectorAll('[role="option"]'))
    .find((o) => o.textContent.trim() === 'Achievement');
  option.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("\ncategory 'Achievement':", JSON.stringify(await evaluate(noticeState)));

// 4. Back to all categories.
await evaluate(`(() => {
  document.querySelector('[role="combobox"]').click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
await evaluate(`(() => {
  const option = Array.from(document.querySelectorAll('[role="option"]'))
    .find((o) => o.textContent.trim() === 'All categories');
  option.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("\ncategory 'All categories':", JSON.stringify(await evaluate(noticeState)));

// 5. Narrow the date range with the from-date control.
await evaluate(`(() => {
  const input = document.querySelector('input[type="date"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, '2026-11-02');
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("\nfrom date 2026-11-02:", JSON.stringify(await evaluate(noticeState)));

// ---------------------------------------------------------------- Lightbox
await send("Page.navigate", {
  url: "http://localhost:3111/student/gallery/science-fair-2026",
});
await new Promise((resolve) => setTimeout(resolve, 2500));

const lightboxState = `(() => {
  const dialog = document.querySelector('[role="dialog"]');
  const photos = Array.from(document.querySelectorAll('main button[aria-label^="Open"]'));
  return {
    photos: photos.length,
    dialogOpen: Boolean(dialog),
    dialogTitle: dialog?.querySelector('h2')?.textContent.trim() ?? null,
    counter: dialog
      ? Array.from(dialog.querySelectorAll('p')).map((p) => p.textContent.trim()).find((t) => /\\d+ \\/ \\d+/.test(t)) ?? null
      : null,
  };
})()`;

console.log("\nalbum before:", JSON.stringify(await evaluate(lightboxState)));

await evaluate(`(() => {
  document.querySelector('main button[aria-label^="Open"]').click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 800));
console.log("\nalbum lightbox open:", JSON.stringify(await evaluate(lightboxState)));

// Next photo.
await evaluate(`(() => {
  const buttons = Array.from(document.querySelectorAll('[role="dialog"] button'));
  const next = buttons.find((b) => /Next/.test(b.textContent));
  next.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 500));
console.log("\nalbum after next:", JSON.stringify(await evaluate(lightboxState)));

// Close.
await evaluate(`(() => {
  document.querySelector('[role="dialog"] button[aria-label*="Close"]').click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 500));
console.log("\nalbum after close:", JSON.stringify(await evaluate(lightboxState)));

ws.close();
