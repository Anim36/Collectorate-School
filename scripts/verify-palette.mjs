/**
 * Verifies the design-system page with Chrome DevTools Protocol:
 * reads the computed colours of the light and dark preview panels and
 * reports which CSS variables each scope resolved to.
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
await send("Page.navigate", { url: "http://localhost:3111/design-system" });
await new Promise((resolve) => setTimeout(resolve, 3500));

const expression = `(() => {
  const scopes = Array.from(document.querySelectorAll('div.light, div.dark'));
  const report = scopes.map((scope) => {
    const cs = getComputedStyle(scope);
    const buttons = Array.from(scope.querySelectorAll('button'));
    const primary = buttons.find((b) => getComputedStyle(b).backgroundColor === 'rgb(30, 59, 138)' || getComputedStyle(b).backgroundColor === 'rgb(36, 99, 235)');
    const secondary = buttons.find((b) => getComputedStyle(b).backgroundColor === 'rgb(255, 255, 255)' || getComputedStyle(b).backgroundColor === 'rgb(17, 29, 49)');
    const badge = scope.querySelector('span[class*="rounded-[8px]"]');
    const heading = scope.querySelector('p[class*="font-semibold"], p');
    const body = scope.querySelector('p[class*="text-body"]');
    return {
      scope: scope.className.includes('light') ? 'light' : 'dark',
      primaryBtnBg: primary ? getComputedStyle(primary).backgroundColor : null,
      primaryBtnColor: primary ? getComputedStyle(primary).color : null,
      primaryBtnSize: primary ? getComputedStyle(primary).fontSize : null,
      secondaryBtnBg: secondary ? getComputedStyle(secondary).backgroundColor : null,
      secondaryBtnColor: secondary ? getComputedStyle(secondary).color : null,
      badgeColor: badge ? getComputedStyle(badge).color : null,
      headingColor: heading ? getComputedStyle(heading).color : null,
      bodyColor: body ? getComputedStyle(body).color : null,
      bodySize: body ? getComputedStyle(body).fontSize : null,
    };
  });
  return report;
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

const rows = result.result.value ?? [];
const seen = new Set();
for (const row of rows) {
  const key = JSON.stringify(row);
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(JSON.stringify(row));
}
ws.close();
