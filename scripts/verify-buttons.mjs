/** Verifies the four Figma button styles render with the right tokens. */

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
  for (const scope of document.querySelectorAll('div.light, div.dark')) {
    const theme = scope.className.includes('light') ? 'light' : 'dark';
    const wanted = ['Apply Now', 'Secondary', 'Ghost', 'Disabled'];
    for (const label of wanted) {
      const btn = Array.from(scope.querySelectorAll('button')).find((b) => b.textContent.trim() === label);
      if (!btn) continue;
      const cs = getComputedStyle(btn);
      out.push({
        theme,
        label,
        bg: cs.backgroundColor,
        color: cs.color,
        border: cs.borderTopWidth === '0px' ? 'none' : cs.borderTopWidth + ' ' + cs.borderTopColor,
        radius: cs.borderRadius,
        padding: cs.padding,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        disabled: btn.disabled,
      });
    }
  }
  return out;
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

for (const row of result.result.value ?? []) {
  console.log(
    `[${row.theme}] ${row.label.padEnd(10)} bg=${String(row.bg).padEnd(22)} color=${String(row.color).padEnd(20)} border=${String(row.border).padEnd(20)} r=${row.radius.padEnd(7)} p=${row.padding.padEnd(16)} ${row.fontSize}/${row.fontWeight} disabled=${row.disabled}`,
  );
}
ws.close();
