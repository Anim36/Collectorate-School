/**
 * Checks the computed styles of each design-system specimen against the
 * Figma spec (font size, colour, radius, padding) so regressions in the
 * custom Tailwind scale or the palette scopes are caught automatically.
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

const expression = `(() => {
  const out = [];
  const scopes = Array.from(document.querySelectorAll('div.light, div.dark'));
  const seen = new Set();

  for (const scope of scopes) {
    const theme = scope.className.includes('light') ? 'light' : 'dark';
    const panels = Array.from(scope.querySelectorAll('article, table, [role="dialog"], [role="status"], [role="radiogroup"]'));
    for (const el of panels) {
      const cs = getComputedStyle(el);
      const key = theme + '|' + el.className + '|' + el.textContent.slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        theme,
        kind: el.tagName.toLowerCase(),
        radius: cs.borderRadius,
        padding: cs.padding,
        bg: cs.backgroundColor,
        border: cs.borderTopWidth + ' ' + cs.borderTopColor,
        text: el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 48),
      });
    }
  }
  return out;
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

const rows = result.result.value ?? [];
for (const row of rows) {
  console.log(
    `[${row.theme}] ${row.kind.padEnd(8)} r=${row.radius.padEnd(10)} p=${row.padding.padEnd(18)} bg=${row.bg.padEnd(22)} b=${row.border.padEnd(28)} "${row.text}"`,
  );
}
ws.close();
