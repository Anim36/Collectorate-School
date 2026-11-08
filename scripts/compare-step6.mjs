/**
 * Compares a rendered public page against the Figma frame measurements.
 *
 * Usage: node scripts/compare-step6.mjs <route> <width>
 *   e.g. node scripts/compare-step6.mjs /notice 1440
 *
 * The Figma values come from the cached canvas metadata for the step 6
 * public frames: "Public / Notice" (2:1480 / 2:1587 / 2:1688),
 * "Public / Notice detail" (2:1786 / 2:1862 / 2:1932),
 * "Public / Gallery" (2:1996 / 2:2071 / 2:2140),
 * "Public / Album detail" (2:2207 / 2:2269 / 2:2325),
 * "Public / Academic Calendar" (2:2379 / 2:2535 / 2:2686) and
 * "Public / Routine" (2:2834 / 2:2961 / 2:3082).
 */

const expected = {
  "/notice": {
    1440: {
      pageIntroduction: { top: 145, height: 292, padX: 80, padY: 80 },
      main: { top: 437, height: 708, padX: 80, padY: 80 },
      footer: { top: 1145, height: 309 },
      totalHeight: 1454,
    },
    768: {
      pageIntroduction: { top: 145, height: 196, padX: 32, padY: 32 },
      main: { top: 341, height: 800, padX: 32, padY: 32 },
      footer: { top: 1141, height: 367 },
      totalHeight: 1508,
    },
    375: {
      pageIntroduction: { top: 137, height: 237, padX: 24, padY: 24 },
      main: { top: 374, height: 1221, padX: 24, padY: 24 },
      footer: { top: 1595, height: 875 },
      totalHeight: 2470,
    },
  },
  "/notice/annual-examination-schedule": {
    1440: {
      pageIntroduction: { top: 145, height: 292, padX: 80, padY: 80 },
      main: { top: 437, height: 997, padX: 80, padY: 80 },
      footer: { top: 1434, height: 309 },
      totalHeight: 1743,
    },
    768: {
      pageIntroduction: { top: 145, height: 254, padX: 32, padY: 32 },
      main: { top: 399, height: 967, padX: 32, padY: 32 },
      footer: { top: 1366, height: 367 },
      totalHeight: 1733,
    },
    375: {
      pageIntroduction: { top: 137, height: 237, padX: 24, padY: 24 },
      main: { top: 374, height: 1192, padX: 24, padY: 24 },
      footer: { top: 1566, height: 875 },
      totalHeight: 2441,
    },
  },
  "/gallery": {
    1440: {
      pageIntroduction: { top: 145, height: 292, padX: 80, padY: 80 },
      main: { top: 437, height: 999, padX: 80, padY: 80 },
      footer: { top: 1436, height: 309 },
      totalHeight: 1745,
    },
    768: {
      pageIntroduction: { top: 145, height: 196, padX: 32, padY: 32 },
      main: { top: 341, height: 903, padX: 32, padY: 32 },
      footer: { top: 1244, height: 367 },
      totalHeight: 1611,
    },
    375: {
      pageIntroduction: { top: 137, height: 237, padX: 24, padY: 24 },
      main: { top: 374, height: 1699, padX: 24, padY: 24 },
      footer: { top: 2073, height: 875 },
      totalHeight: 2948,
    },
  },
  "/gallery/science-fair-2026": {
    1440: {
      pageIntroduction: { top: 145, height: 292, padX: 80, padY: 80 },
      main: { top: 437, height: 712, padX: 80, padY: 80 },
      footer: { top: 1149, height: 309 },
      totalHeight: 1458,
    },
    768: {
      pageIntroduction: { top: 145, height: 196, padX: 32, padY: 32 },
      main: { top: 341, height: 616, padX: 32, padY: 32 },
      footer: { top: 957, height: 367 },
      totalHeight: 1324,
    },
    375: {
      pageIntroduction: { top: 137, height: 191, padX: 24, padY: 24 },
      main: { top: 328, height: 1184, padX: 24, padY: 24 },
      footer: { top: 1512, height: 875 },
      totalHeight: 2387,
    },
  },
  "/calendar": {
    1440: {
      pageIntroduction: { top: 145, height: 292, padX: 80, padY: 80 },
      main: { top: 437, height: 1144, padX: 80, padY: 80 },
      footer: { top: 1581, height: 309 },
      totalHeight: 1890,
    },
    768: {
      pageIntroduction: { top: 145, height: 196, padX: 32, padY: 32 },
      main: { top: 341, height: 1227, padX: 32, padY: 32 },
      footer: { top: 1568, height: 367 },
      totalHeight: 1935,
    },
    375: {
      pageIntroduction: { top: 137, height: 237, padX: 24, padY: 24 },
      main: { top: 374, height: 1188, padX: 24, padY: 24 },
      footer: { top: 1562, height: 875 },
      totalHeight: 2437,
    },
  },
  "/routine": {
    1440: {
      pageIntroduction: { top: 145, height: 292, padX: 80, padY: 80 },
      main: { top: 437, height: 883, padX: 80, padY: 80 },
      footer: { top: 1320, height: 309 },
      totalHeight: 1629,
    },
    768: {
      pageIntroduction: { top: 145, height: 196, padX: 32, padY: 32 },
      main: { top: 341, height: 806, padX: 32, padY: 32 },
      footer: { top: 1147, height: 367 },
      totalHeight: 1514,
    },
    375: {
      pageIntroduction: { top: 137, height: 237, padX: 24, padY: 24 },
      main: { top: 374, height: 1866, padX: 24, padY: 24 },
      footer: { top: 2240, height: 875 },
      totalHeight: 3115,
    },
  },
};

// Positional arguments only: a flag such as --dark must not be read as the
// viewport height, or Number() yields NaN and the override silently fails.
const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const route = positional[0] ?? "/notice";
const width = Number(positional[1] ?? 1440);
const height = Number(positional[2] ?? 1200);
const dark = process.argv.includes("--dark");

const target = expected[route]?.[width];
if (!target) {
  console.log(`no Figma reference for ${route} @ ${width}`);
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
  height,
  deviceScaleFactor: 1,
  mobile: false,
});
// Dark mode is checked with the same geometry, so the theme is forced before
// the page is measured.
if (dark) {
  await send("Page.navigate", { url: "http://localhost:3111/" });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await send("Runtime.evaluate", {
    expression: `localStorage.setItem('theme', 'dark');`,
  });
}
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const main = document.querySelector('main');
  const sections = Array.from(main.children);
  const footer = document.querySelector('footer');
  const box = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      top: Math.round(r.top + window.scrollY),
      height: Math.round(r.height),
      padX: parseFloat(cs.paddingLeft),
      padY: parseFloat(cs.paddingTop),
    };
  };
  return {
    footer: box(footer),
    sections: sections.map(box),
    totalHeight: Math.round(document.documentElement.scrollHeight),
  };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

const actual = result.result.value;

function report(label, want, got) {
  if (!got) {
    console.log(`${label.padEnd(18)} MISSING`);
    return;
  }
  const dTop = got.top - want.top;
  const dHeight = got.height - want.height;
  const dPadX = want.padX === undefined ? 0 : got.padX - want.padX;
  const dPadY = want.padY === undefined ? 0 : got.padY - want.padY;
  const flag =
    Math.abs(dTop) > 6 || Math.abs(dHeight) > 6 || Math.abs(dPadX) > 1 || Math.abs(dPadY) > 1
      ? "  <-- CHECK"
      : "";
  console.log(
    `${label.padEnd(18)} top ${String(got.top).padStart(5)} (want ${String(want.top).padStart(5)}, d${dTop})  ` +
      `h ${String(got.height).padStart(5)} (want ${String(want.height).padStart(5)}, d${dHeight})  ` +
      `pad ${got.padX}/${got.padY} (want ${want.padX ?? "-"}/${want.padY ?? "-"})${flag}`,
  );
}

console.log(`=== ${route} @ ${width}px ===`);
report("pageIntroduction", target.pageIntroduction, actual.sections[0]);
report("main", target.main, actual.sections[1]);
report("footer", target.footer, actual.footer);

const dTotal = actual.totalHeight - target.totalHeight;
console.log(
  `total height ${actual.totalHeight} (want ${target.totalHeight}, d${dTotal})` +
    (Math.abs(dTotal) > 6 ? "  <-- CHECK" : ""),
);

ws.close();
