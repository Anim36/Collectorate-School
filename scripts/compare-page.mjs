/**
 * Compares a rendered public page against the Figma frame measurements.
 *
 * Usage: node scripts/compare-page.mjs <route> <width>
 *   e.g. node scripts/compare-page.mjs /admission 1440
 *
 * The Figma values come from the cached canvas metadata for
 * "Public / Admission", "Public / Teachers & Staff" and "Public / About"
 * (light frames 2:640 / 2:736 / 2:827, 2:916 / 2:1013 / 2:1105 and
 * 2:1196 / 2:1293 / 2:1386).
 */

/**
 * The site navbar, below the utility bar.
 * Figma "Navbar / 1440" (2:16045), "/ 768" (2:16083) and "/ 375" (2:16121),
 * the same band the home page compares against.
 */
const navbar = {
  1440: { top: 43, height: 102 },
  768: { top: 43, height: 102 },
  375: { top: 41, height: 96 },
};

const expected = {
  "/admission": {
    1440: {
      pageIntroduction: { top: 145, height: 292, padX: 80, padY: 80 },
      admissionMain: { top: 437, height: 1203, padX: 80, padY: 80 },
      footer: { top: 1640, height: 309 },
      totalHeight: 1949,
    },
    768: {
      pageIntroduction: { top: 145, height: 196, padX: 32, padY: 32 },
      admissionMain: { top: 341, height: 1286, padX: 32, padY: 32 },
      footer: { top: 1627, height: 367 },
      totalHeight: 1994,
    },
    375: {
      pageIntroduction: { top: 137, height: 237, padX: 24, padY: 24 },
      admissionMain: { top: 374, height: 1997, padX: 24, padY: 24 },
      footer: { top: 2371, height: 875 },
      totalHeight: 3246,
    },
  },
  "/teachers": {
    1440: {
      pageIntroduction: { top: 145, height: 292, padX: 80, padY: 80 },
      staffMain: { top: 437, height: 1133, padX: 80, padY: 80 },
      footer: { top: 1570, height: 309 },
      totalHeight: 1879,
    },
    768: {
      pageIntroduction: { top: 145, height: 196, padX: 32, padY: 32 },
      staffMain: { top: 341, height: 1458, padX: 32, padY: 32 },
      footer: { top: 1799, height: 367 },
      totalHeight: 2166,
    },
    375: {
      pageIntroduction: { top: 137, height: 237, padX: 24, padY: 24 },
      staffMain: { top: 374, height: 2793, padX: 24, padY: 24 },
      footer: { top: 3167, height: 875 },
      totalHeight: 4042,
    },
  },
  "/about": {
    1440: {
      pageIntroduction: { top: 145, height: 292, padX: 80, padY: 80 },
      aboutMain: { top: 437, height: 1535, padX: 80, padY: 80 },
      footer: { top: 1972, height: 309 },
      totalHeight: 2281,
    },
    768: {
      pageIntroduction: { top: 145, height: 254, padX: 32, padY: 32 },
      aboutMain: { top: 399, height: 1889, padX: 32, padY: 32 },
      footer: { top: 2288, height: 367 },
      totalHeight: 2655,
    },
    375: {
      pageIntroduction: { top: 137, height: 237, padX: 24, padY: 24 },
      aboutMain: { top: 374, height: 2988, padX: 24, padY: 24 },
      footer: { top: 3362, height: 875 },
      totalHeight: 4237,
    },
  },
};

// Positional arguments only: a flag such as --dark must not be read as the
// viewport height, or Number() yields NaN and the override silently fails.
const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const route = positional[0] ?? "/admission";
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
  const header = document.querySelector('header');
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
    header: box(header),
    footer: box(footer),
    sections: sections.map(box),
    totalHeight: Math.round(
      document.documentElement.scrollHeight
    ),
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
report("navbar", navbar[width], actual.header);
report("pageIntroduction", target.pageIntroduction, actual.sections[0]);
report("main", target.admissionMain ?? target.staffMain ?? target.aboutMain, actual.sections[1]);
report("footer", target.footer, actual.footer);

const dTotal = actual.totalHeight - target.totalHeight;
console.log(
  `total height ${actual.totalHeight} (want ${target.totalHeight}, d${dTotal})` +
    (Math.abs(dTotal) > 6 ? "  <-- CHECK" : ""),
);

ws.close();
