/**
 * Checks the sticky navbar in the browser.
 *
 * Opens the mobile drawer, reads how the band behaves while the page is
 * scrolled and checks that the drawer closes itself on a route change.
 *
 * Usage: node scripts/qa/check-navbar.mjs
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
    const messageId = ++id;
    pending.set(messageId, resolve);
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });
}

ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result);
    pending.delete(message.id);
  }
});

await new Promise((resolve) => ws.addEventListener("open", resolve));
await send("Page.enable");
await send("Runtime.enable");

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result?.value ?? { error: result.exceptionDetails?.text };
};

/* The band stays at the top of the viewport while the page scrolls. */

await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3111/" });
await new Promise((resolve) => setTimeout(resolve, 2500));

const sticky = await evaluate(`(() => {
  const header = document.querySelector('header');
  const before = header.getBoundingClientRect().top;
  window.scrollTo(0, 1200);
  const after = header.getBoundingClientRect().top;
  const cs = getComputedStyle(header);
  window.scrollTo(0, 0);
  return { before: Math.round(before), after: Math.round(after), position: cs.position };
})()`);

console.log("sticky:", JSON.stringify(sticky));

/* The drawer opens, shows the navigation and closes on a route change. */

await send("Emulation.setDeviceMetricsOverride", {
  width: 375,
  height: 812,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3111/" });
await new Promise((resolve) => setTimeout(resolve, 2500));

const closed = await evaluate(`(() => {
  const panel = document.getElementById('mobile-navigation');
  const cs = getComputedStyle(panel);
  return {
    hidden: panel.hasAttribute('hidden'),
    display: cs.display,
    background: cs.backgroundColor,
  };
})()`);

console.log("drawer closed:", JSON.stringify(closed));

await evaluate(
  `document.querySelector('header button[aria-controls="mobile-navigation"]').click()`,
);
await new Promise((resolve) => setTimeout(resolve, 600));

const opened = await evaluate(`(() => {
  const panel = document.getElementById('mobile-navigation');
  const cs = getComputedStyle(panel);
  const links = Array.from(panel.querySelectorAll('a')).map((a) => {
    const r = a.getBoundingClientRect();
    return {
      text: a.textContent.trim(),
      visible: r.width > 0 && r.height > 0,
      color: getComputedStyle(a).color,
    };
  });
  return {
    hidden: panel.hasAttribute('hidden'),
    display: cs.display,
    background: cs.backgroundColor,
    top: Math.round(panel.getBoundingClientRect().top),
    height: Math.round(panel.getBoundingClientRect().height),
    overflowsPage: panel.getBoundingClientRect().height > innerHeight,
    links,
  };
})()`);

console.log("drawer open:", JSON.stringify(opened, null, 1));

/* The drawer closes itself when the route changes. */

await evaluate(`history.pushState({}, '', '/about'); window.dispatchEvent(new PopStateEvent('popstate'));`);
await new Promise((resolve) => setTimeout(resolve, 900));

const afterRoute = await evaluate(`(() => {
  const panel = document.getElementById('mobile-navigation');
  return { hidden: panel.hasAttribute('hidden'), url: location.pathname };
})()`);

console.log("after route:", JSON.stringify(afterRoute));

ws.close();
