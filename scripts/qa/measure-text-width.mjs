/**
 * Measures candidate strings in a page element's own font by cloning the
 * element into the document body with `width: max-content`, so the reported
 * width is the true text width. It then reports how many lines the string
 * takes at each requested width.
 *
 * Usage:
 *   node scripts/qa/measure-text-width.mjs <route> <selector> <width>[:<width>...] <candidate...>
 *
 * A candidate may be prefixed with a font stack: "Hind Siliguri|৳ 3,000".
 */
const route = process.argv[2] ?? "/student/dashboard";
const selector = process.argv[3] ?? "main > div > section > p";
const widths = Object.fromEntries(
  (process.argv[4] ?? "1440:1088")
    .split(",")
    .map((pair) => pair.split(":"))
    .map(([key, value]) => [key, Number(value)]),
);
const candidates = process.argv.slice(5);

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
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const probe = document.querySelector(${JSON.stringify(selector)});
  if (!probe) return null;

  const cs = getComputedStyle(probe);
  const items = ${JSON.stringify(candidates)};
  const widths = ${JSON.stringify(widths)};

  const lines = (clone, width) => {
    clone.style.width = width + 'px';
    const range = document.createRange();
    range.selectNodeContents(clone);
    const rects = Array.from(range.getClientRects());
    const tops = [];
    for (const r of rects) {
      if (!tops.some((t) => Math.abs(t - r.top) < 2)) tops.push(Math.round(r.top));
    }
    return tops.length;
  };

  const measure = (text, fontFamily) => {
    const clone = probe.cloneNode(false);
    clone.textContent = text;
    clone.style.position = 'fixed';
    clone.style.top = '0';
    clone.style.left = '0';
    clone.style.visibility = 'hidden';
    clone.style.whiteSpace = 'normal';
    clone.style.width = 'max-content';
    clone.style.maxWidth = 'none';
    clone.style.display = 'block';
    if (fontFamily) clone.style.fontFamily = fontFamily;
    document.body.appendChild(clone);

    const natural = Math.round(clone.getBoundingClientRect().width);
    const counts = {};
    for (const [key, width] of Object.entries(widths)) {
      counts[key] = lines(clone, width);
    }

    clone.remove();
    return { natural, counts };
  };

  return {
    font: cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily,
    items: items.map((entry) => {
      const split = entry.indexOf('|');
      const family = split === -1 ? null : entry.slice(0, split);
      const text = split === -1 ? entry : entry.slice(split + 1);
      const result = measure(text, family);
      return { text, family: family ?? 'inherit', ...result };
    }),
  };
})()`;

const result = await send("Runtime.evaluate", { expression, returnByValue: true });
const data = result.result.value;
if (!data) {
  console.log("NO PROBE");
  process.exit(1);
}

console.log(`probe font: ${data.font}\n`);
for (const item of data.items) {
  console.log(
    `natural ${String(item.natural).padStart(4)}  lines ${Object.entries(item.counts)
      .map(([k, v]) => `${k}:${v}`)
      .join("  ")}  [${item.family}]  ${item.text}`,
  );
}

ws.close();
