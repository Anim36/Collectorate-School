/**
 * Measures the print run of the receipt page on an A4 sheet, so the paper
 * holds the receipt and nothing else.
 *
 * Usage: node scripts/qa/check-student-9d-print.mjs
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
await send("Runtime.enable");

// A4 portrait with the 16mm margin of the print stylesheet.
const mm = 96 / 25.4;
const paperWidth = Math.round(210 * mm - 32 * mm);
const paperHeight = Math.round(297 * mm - 32 * mm);

await send("Emulation.setDeviceMetricsOverride", {
  width: paperWidth,
  height: paperHeight,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Emulation.setEmulatedMedia", { media: "print" });
await send("Page.navigate", {
  url: "http://localhost:3111/student/fees/receipt/RCPT-2026-1042",
});
await new Promise((resolve) => setTimeout(resolve, 2600));

const result = await send("Runtime.evaluate", {
  expression: `(() => {
    const shown = (el) => {
      if (!el) return null;
      // An element inside a hidden ancestor draws nothing.
      const r = el.getBoundingClientRect();
      return {
        rendered: el.getClientRects().length > 0,
        width: Math.round(r.width),
        height: Math.round(r.height),
        text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40),
      };
    };

    const main = document.querySelector('main');
    const children = Array.from(main?.firstElementChild?.children ?? []);

    return {
      paperWidth: ${paperWidth},
      paperHeight: ${paperHeight},
      scrollHeight: Math.ceil(document.documentElement.scrollHeight),
      scrollWidth: Math.ceil(document.documentElement.scrollWidth),
      sidebar: shown(document.querySelector('[data-portal="sidebar"]')),
      topBar: shown(document.querySelector('[data-portal="top-bar"]')),
      bottomNav: shown(document.querySelector('[data-portal="bottom-nav"]')),
      blocks: children.map((el) => ({
        cls: (el.getAttribute('class') || '').slice(0, 48),
        ...shown(el),
      })),
      buttons: Array.from(document.querySelectorAll('main button')).map((el) => ({
        label: el.textContent.trim(),
        rendered: el.getClientRects().length > 0,
        inCard: Boolean(el.closest('[data-receipt="card"]')),
      })),
    };
  })()`,
  returnByValue: true,
});

const data = result.result.value;

console.log(`=== receipt print run @ A4 (${data.paperWidth}x${data.paperHeight}px) ===`);
console.log(`  scroll size   ${data.scrollWidth}x${data.scrollHeight}`);
console.log(`  sidebar       ${data.sidebar?.rendered ? "VISIBLE" : "hidden"}`);
console.log(`  top bar       ${data.topBar?.rendered ? "VISIBLE" : "hidden"}`);
console.log(`  bottom nav    ${data.bottomNav?.rendered ? "VISIBLE" : "hidden"}`);
console.log("  blocks:");
for (const block of data.blocks) {
  console.log(
    `    ${block.rendered ? "drawn " : "hidden"} ${String(block.width).padStart(4)}x${String(block.height).padStart(4)}  ${block.cls}`,
  );
}
console.log("  buttons:");
for (const button of data.buttons) {
  console.log(
    `    ${button.rendered ? "VISIBLE" : "hidden"}  "${button.label}"${button.inCard ? " (card)" : ""}`,
  );
}

await send("Emulation.setEmulatedMedia", { media: "" });
ws.close();
