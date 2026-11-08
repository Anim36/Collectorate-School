/**
 * Exercises the navbar interactions: the desktop dropdown opens, the mobile
 * drawer opens and closes, and the active link is marked.
 */

const width = Number(process.argv[2] ?? 1440);
const height = Number(process.argv[3] ?? 900);

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
await new Promise((resolve) => setTimeout(resolve, 2500));

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result.value;
}

console.log(`viewport ${width}`);

const navLinks = await evaluate(`(() => {
  const links = Array.from(document.querySelectorAll('header nav a'));
  return links.map((a) => ({
    text: a.textContent.trim(),
    href: a.getAttribute('href'),
    current: a.getAttribute('aria-current'),
    color: getComputedStyle(a).color,
  }));
})()`);
console.log("nav links:", JSON.stringify(navLinks));

if (width < 1280) {
  const drawer = await evaluate(`(() => {
    const button = document.querySelector('header button[aria-controls="mobile-navigation"]');
    if (!button) return { found: false };
    const before = button.getAttribute('aria-expanded');
    button.click();
    return new Promise((resolve) => setTimeout(() => {
      const panel = document.getElementById('mobile-navigation');
      resolve({
        found: true,
        before,
        after: button.getAttribute('aria-expanded'),
        panelHidden: panel.hasAttribute('hidden'),
        panelHeight: Math.round(panel.getBoundingClientRect().height),
        itemCount: panel.querySelectorAll('a').length,
      });
    }, 300));
  })()`);
  console.log("mobile drawer:", JSON.stringify(drawer));

  const closed = await evaluate(`(() => {
    const button = document.querySelector('header button[aria-controls="mobile-navigation"]');
    button.click();
    return new Promise((resolve) => setTimeout(() => {
      resolve({ expanded: button.getAttribute('aria-expanded') });
    }, 300));
  })()`);
  console.log("drawer after close:", JSON.stringify(closed));
} else {
  const dropdown = await evaluate(`(() => {
    const trigger = Array.from(document.querySelectorAll('header nav button')).find((b) =>
      b.textContent.includes('Admission'));
    trigger.click();
    return new Promise((resolve) => setTimeout(() => {
      const content = document.querySelector('[role="menu"]');
      resolve({
        open: content ? content.getAttribute('data-state') : null,
        width: content ? Math.round(content.getBoundingClientRect().width) : null,
        items: content ? Array.from(content.querySelectorAll('a')).map((a) => a.textContent.trim()) : [],
      });
    }, 400));
  })()`);
  console.log("admission dropdown:", JSON.stringify(dropdown));
}

const theme = await evaluate(`(() => {
  const toggle = document.querySelector('header button[aria-label*="theme"]');
  const before = document.documentElement.className;
  toggle.click();
  return new Promise((resolve) => setTimeout(() => {
    resolve({ before, after: document.documentElement.className });
  }, 400));
})()`);
console.log("theme toggle:", JSON.stringify(theme));

ws.close();
