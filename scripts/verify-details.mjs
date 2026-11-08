/** Verifies table header tint, tab states and field control styles. */

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

    const header = scope.querySelector('thead tr');
    if (header) {
      const cs = getComputedStyle(header);
      const th = header.querySelector('th');
      const thcs = th ? getComputedStyle(th) : null;
      out.push({
        theme,
        what: 'table-header',
        bg: cs.backgroundColor,
        fontSize: thcs?.fontSize,
        fontWeight: thcs?.fontWeight,
        color: thcs?.color,
      });
    }

    const bodyCell = scope.querySelector('tbody td');
    if (bodyCell) {
      const cs = getComputedStyle(bodyCell);
      out.push({
        theme,
        what: 'table-cell',
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        color: cs.color,
      });
    }

    const pagination = scope.querySelector('nav[aria-label*="pagination"]');
    if (pagination) {
      const active = pagination.querySelector('[aria-current="page"]');
      const cs = active ? getComputedStyle(active) : null;
      out.push({
        theme,
        what: 'pagination-active',
        bg: cs?.backgroundColor,
        color: cs?.color,
        label: active?.textContent,
      });
    }

    const tabs = scope.querySelectorAll('[role="tab"]');
    if (tabs.length) {
      out.push({
        theme,
        what: 'tabs',
        list: Array.from(tabs).map((t) => {
          const c = getComputedStyle(t);
          return t.textContent + '=' + c.color + '@' + c.fontSize + '/' + c.fontWeight;
        }).join(' | '),
      });
    }

    const fieldLabels = Array.from(scope.querySelectorAll('label'));
    if (fieldLabels.length) {
      const c = getComputedStyle(fieldLabels[0]);
      out.push({
        theme,
        what: 'field-label',
        text: fieldLabels[0].textContent,
        fontSize: c.fontSize,
        fontWeight: c.fontWeight,
        color: c.color,
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
  console.log(JSON.stringify(row));
}
ws.close();
