/**
 * Compares the public notice board's empty state against the Figma frame.
 *
 * Usage: node scripts/compare-11c-notice.mjs <width>
 */
const width = Number(process.argv[2] ?? 1440);

/**
 * The Figma values, measured from the top of the notice section.
 *
 * Figma "Public / Notice empty" (2:15678 desktop, 2:15786 tablet, 2:15888
 * mobile and the matching dark frames): the empty panel sits beside the
 * filters on desktop, under them on tablet and under them on mobile.
 */
const expected = {
  1440: {
    empty: { top: 80, height: 183 },
    heading: { top: 105, height: 29 },
    copy: { top: 150, height: 23 },
    action: { top: 189, height: 49 },
  },
  768: {
    empty: { top: 140, height: 183 },
    heading: { top: 165, height: 29 },
    copy: { top: 210, height: 23 },
    action: { top: 249, height: 49 },
  },
  375: {
    empty: { top: 316, height: 206 },
    heading: { top: 341, height: 29 },
    copy: { top: 386, height: 46 },
    action: { top: 448, height: 49 },
  },
};

const target = expected[width];
if (!target) {
  console.log(`no Figma reference for the notice empty state @ ${width}`);
  process.exit(1);
}

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

// The notice board opens on every notice, so a range that matches nothing
// opens the empty state.
await send("Page.navigate", { url: "http://localhost:3111/notice" });
await new Promise((resolve) => setTimeout(resolve, 2600));

await evaluate(`(() => {
  const buttons = [...document.querySelectorAll("button")];
  const trigger = buttons.find((b) => b.textContent.includes("All categories"));
  trigger.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));

await evaluate(`(() => {
  const option = [...document.querySelectorAll('[role="option"]')].find((o) =>
    o.textContent.trim() === "Achievement",
  );
  option.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));

// A second achievement notice exists, so the board is narrowed but not empty.
// The from-date is pushed past the last notice to open the empty state.
await evaluate(`(() => {
  const input = document.querySelector('input[type="date"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, '2026-12-01');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 800));

const result = await evaluate(`(() => {
  const heading = [...document.querySelectorAll("h2")].find((h) =>
    h.textContent.includes("No notices match"),
  );
  if (!heading) return { error: "no empty state" };

  const panel = heading.parentElement;
  const copy = panel.querySelector("p");
  const action = [...panel.querySelectorAll("button")].find((b) =>
    b.textContent.includes("Clear filters"),
  );

  const main = panel.closest("section");
  const base = main.getBoundingClientRect().top;

  const box = (el) => {
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top - base),
      height: Math.round(r.height),
    };
  };

  // How the two lines of copy actually break.
  const lines = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return [...range.getClientRects()].map((r) => ({
      width: Math.round(r.width),
      top: Math.round(r.top),
    }));
  };

  return {
    empty: box(panel),
    heading: box(heading),
    copy: box(copy),
    action: box(action),
    headingSize: getComputedStyle(heading).fontSize,
    headingLines: lines(heading),
    copyLines: lines(copy),
    panelWidth: Math.round(panel.getBoundingClientRect().width),
  };
})()`);

if (result.error) {
  console.log(result.error);
  process.exit(1);
}

let failures = 0;

function report(label, want, got) {
  const dTop = got.top - want.top;
  const dHeight = got.height - want.height;
  const flag =
    Math.abs(dTop) > 6 || Math.abs(dHeight) > 6 ? "  <-- CHECK" : "";
  if (flag) failures += 1;

  console.log(
    `${label.padEnd(12)} top ${String(got.top).padStart(5)} (want ${String(want.top).padStart(5)}, d${dTop})` +
      `  h ${String(got.height).padStart(4)} (want ${String(want.height).padStart(4)}, d${dHeight})${flag}`,
  );
}

console.log(`=== /notice empty state @ ${width}px ===`);

console.log(
  `      heading ${result.headingSize} in ${result.headingLines.length} line(s),` +
    ` panel ${result.panelWidth}px`,
);
console.log(`      copy breaks into ${result.copyLines.length} line(s)`);

report("empty", target.empty, result.empty);
report("heading", target.heading, result.heading);
report("copy", target.copy, result.copy);
report("action", target.action, result.action);

console.log(
  failures === 0
    ? "ALL WITHIN TOLERANCE"
    : `${failures} block(s) out of tolerance`,
);

ws.close();
process.exit(failures === 0 ? 0 : 1);
