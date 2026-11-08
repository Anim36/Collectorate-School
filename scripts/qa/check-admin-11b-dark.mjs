/**
 * Reports the resolved colours of the admin pages in the dark theme, so the
 * surfaces and the text are checked against the Figma dark frames.
 *
 * Usage: node scripts/qa/check-admin-11b-dark.mjs <route> [width]
 */
const route = process.argv[2] ?? "/admin/notices";
const width = Number(process.argv[3] ?? 1440);
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

await send("Page.navigate", { url: "http://localhost:3111/" });
await new Promise((resolve) => setTimeout(resolve, 1200));
await send("Runtime.evaluate", {
  expression: `localStorage.setItem('theme', 'dark');`,
});
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2600));

const expression = `(() => {
  const root = document.documentElement;
  const content = document.querySelector('[data-portal="content"]');
  const surface = document.querySelector('section, [class*="rounded-[12px]"]');

  const box = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      bg: cs.backgroundColor,
      color: cs.color,
      border: cs.borderColor,
    };
  };

  const heading = document.querySelector("h2");
  const muted = [...document.querySelectorAll("p")].find((p) =>
    p.className.includes("text-muted"),
  );
  const primary = [...document.querySelectorAll("button")].find((b) =>
    b.className.includes("bg-action"),
  );

  return {
    htmlClass: root.className,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyColor: getComputedStyle(document.body).color,
    content: box(content),
    surface: box(surface),
    heading: box(heading),
    muted: box(muted),
    primary: box(primary),
  };
})()`;

const result = await send("Runtime.evaluate", { expression, returnByValue: true });
const data = result.result.value;

console.log(`=== ${route} @ ${width}px :: dark ===`);
console.log(`html class: ${data.htmlClass}`);
console.log(`body      bg ${data.bodyBg}  color ${data.bodyColor}`);
console.log(`content   bg ${data.content?.bg}`);
console.log(`surface   bg ${data.surface?.bg}  border ${data.surface?.border}`);
console.log(`heading   color ${data.heading?.color}`);
console.log(`muted     color ${data.muted?.color}`);
console.log(`primary   bg ${data.primary?.bg}  color ${data.primary?.color}`);

ws.close();
