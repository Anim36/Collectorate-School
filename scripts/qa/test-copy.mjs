/**
 * Batch-tests candidate body copy for the About head-message card.
 *
 * Target line counts for the combined attribution + body text block
 * (Figma 2:1267 / 2:1360 / 2:1454): 2 lines on desktop, 3 on tablet and
 * 5 on mobile.
 *
 * Usage: node scripts/qa/test-copy.mjs
 */
const candidates = [
  "Learning is a journey we take together, with our families, our teachers and every child we teach.",
  "Learning is a journey we take together, with our families, our teachers and every child we guide.",
  "Learning is a journey we take together, with our families, our teachers and every child of ours.",
  "Learning is a journey we take together, with our families, our teachers and every child here.",
  "Learning is a journey we take together, with our families, our teachers and every child at heart.",
];

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
await send("Page.navigate", { url: "http://localhost:3111/about" });
await new Promise((resolve) => setTimeout(resolve, 2500));

const widths = [1440, 768, 375];
// Total line counts of the attribution + body block per breakpoint.
const wantedLines = { 1440: 2, 768: 3, 375: 5 };

for (const candidate of candidates) {
  const results = [];

  for (const width of widths) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1200,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const expression = `(() => {
      const p = document.querySelector('main > section:last-child > div article > p');
      if (!p) return null;
      const spans = p.querySelectorAll('span');
      const body = spans[1];
      body.textContent = ${JSON.stringify(candidate)};
      const count = (el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const tops = [];
        for (const r of Array.from(range.getClientRects())) {
          if (!tops.some((t) => Math.abs(t - r.top) < 2)) tops.push(Math.round(r.top));
        }
        return tops.length;
      };
      const p2 = p.getBoundingClientRect();
      return {
        lines: count(p),
        attrLines: count(spans[0]),
        bodyLines: count(body),
        h: Math.round(p2.height),
        contentWidth: Math.round(p2.width),
        blockWidth: Math.round(p.parentElement.getBoundingClientRect().width),
      };
    })()`;

    const result = await send("Runtime.evaluate", { expression, returnByValue: true });
    results.push({ width, ...result.result.value });
  }

  const ok = results.every((r) => r.lines === wantedLines[r.width]);
  console.log(`\n${ok ? "MATCH" : "     "} ${candidate}`);
  for (const r of results) {
    console.log(
      `   ${String(r.width).padStart(4)}  lines ${r.lines} (want ${wantedLines[r.width]})  attr ${r.attrLines} + body ${r.bodyLines}  h ${r.h}  cw ${r.contentWidth}  block ${r.blockWidth}`,
    );
  }
}

ws.close();
