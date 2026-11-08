/**
 * Compares the rendered home page against the Figma frame measurements.
 * Section boundaries and the section padding values are read from the live
 * DOM, then printed next to the values transcribed from Figma.
 */

const expected = {
  1440: {
    utilityBar: { top: 0, height: 43 },
    navbar: { top: 43, height: 102 },
    hero: { top: 145, height: 620, padX: 80, padY: 80 },
    whatsHappening: { top: 765, height: 657, padX: 80, padY: 64 },
    quickAccess: { top: 1422, height: 336, padX: 80, padY: 64 },
    headMessage: { top: 1758, height: 488, padX: 80, padY: 64 },
    galleryPreview: { top: 2246, height: 784, padX: 80, padY: 64 },
    visionMission: { top: 3030, height: 329, padX: 80, padY: 64 },
    footer: { top: 3359, height: 309, padX: 80, padY: 48 },
  },
  768: {
    utilityBar: { top: 0, height: 43 },
    navbar: { top: 43, height: 102 },
    hero: { top: 145, height: 701, padX: 32, padY: 80 },
    whatsHappening: { top: 846, height: 956, padX: 32, padY: 64 },
    quickAccess: { top: 1802, height: 455, padX: 32, padY: 64 },
    headMessage: { top: 2257, height: 542, padX: 32, padY: 64 },
    galleryPreview: { top: 2799, height: 784, padX: 32, padY: 64 },
    visionMission: { top: 3583, height: 375, padX: 32, padY: 64 },
    footer: { top: 3958, height: 367, padX: 32, padY: 48 },
  },
  375: {
    utilityBar: { top: 0, height: 41 },
    navbar: { top: 41, height: 96 },
    hero: { top: 137, height: 771, padX: 24, padY: 40 },
    whatsHappening: { top: 908, height: 1520, padX: 24, padY: 40 },
    quickAccess: { top: 2428, height: 585, padX: 24, padY: 40 },
    headMessage: { top: 3013, height: 822, padX: 24, padY: 40 },
    galleryPreview: { top: 3835, height: 1204, padX: 24, padY: 40 },
    visionMission: { top: 5039, height: 598, padX: 24, padY: 40 },
    footer: { top: 5637, height: 875, padX: 24, padY: 48 },
  },
};

// Positional arguments only: a flag such as --dark must not be read as the
// viewport height, or Number() yields NaN and the override silently fails.
const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const width = Number(positional[0] ?? 1440);
const height = Number(positional[1] ?? 900);
const dark = process.argv.includes("--dark");
const target = expected[width];
if (!target) {
  console.log(`no Figma reference for width ${width}`);
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
await send("Page.navigate", { url: "http://localhost:3111/" });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const main = document.querySelector('main');
  const sections = Array.from(main.children);
  const topBar = document.querySelector('body > div > div:first-child');
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
    utilityBar: box(topBar),
    navbar: box(header),
    footer: box(footer),
    sections: sections.map(box),
  };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

const actual = result.result.value;
const names = [
  "hero",
  "whatsHappening",
  "quickAccess",
  "headMessage",
  "galleryPreview",
  "visionMission",
];

function report(label, want, got) {
  const dTop = got.top - want.top;
  const dHeight = got.height - want.height;
  const dPadX = got.padX - (want.padX ?? 0);
  const dPadY = got.padY - (want.padY ?? 0);
  const flag =
    Math.abs(dTop) > 4 || Math.abs(dHeight) > 4 || Math.abs(dPadX) > 1 || Math.abs(dPadY) > 1
      ? " <-- CHECK"
      : "";
  console.log(
    `${label.padEnd(16)} top ${String(got.top).padStart(5)} (want ${String(want.top).padStart(5)}, d${dTop})  ` +
      `h ${String(got.height).padStart(5)} (want ${String(want.height).padStart(5)}, d${dHeight})  ` +
      `pad ${got.padX}/${got.padY} (want ${want.padX ?? "-"}/${want.padY ?? "-"})${flag}`,
  );
}

console.log(`=== ${width}px ===`);
report("utilityBar", target.utilityBar, actual.utilityBar);
report("navbar", target.navbar, actual.navbar);
names.forEach((name, index) => {
  if (actual.sections[index]) report(name, target[name], actual.sections[index]);
});
report("footer", target.footer, actual.footer);

ws.close();
