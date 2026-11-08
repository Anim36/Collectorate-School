/**
 * Debugs the mobile drawer: whether the Enter key opens it, and what the
 * focus does.
 *
 * Usage: node scripts/qa/debug-drawer.mjs
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
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 375,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3111/" });
await new Promise((resolve) => setTimeout(resolve, 1800));

const read = async (label) => {
  const state = await send("Runtime.evaluate", {
    expression: `(() => {
      const trigger = document.querySelector('header button[aria-controls]');
      const panel = document.getElementById('mobile-navigation');
      return {
        url: location.pathname + location.search,
        expanded: trigger?.getAttribute('aria-expanded'),
        hidden: panel?.hasAttribute('hidden'),
        activeTag: document.activeElement?.tagName,
        activeLabel: document.activeElement?.getAttribute?.('aria-label')
          ?? document.activeElement?.textContent?.trim().slice(0, 20),
        activeHref: document.activeElement?.getAttribute?.('href') ?? null,
      };
    })()`,
    returnByValue: true,
  });
  console.log(label, JSON.stringify(state.result.value));
};

await send("Runtime.evaluate", {
  expression: `document.querySelector('header button[aria-controls]').focus()`,
});
await read("focused:  ");

// A click, so the toggle is exercised without a key press.
await send("Runtime.evaluate", {
  expression: `document.querySelector('header button[aria-controls]').click()`,
});
await new Promise((resolve) => setTimeout(resolve, 500));
await read("after click:");

// Close it again with the same button.
await send("Runtime.evaluate", {
  expression: `document.querySelector('header button[aria-controls]').click()`,
});
await new Promise((resolve) => setTimeout(resolve, 500));
await read("after 2nd:  ");

// Now the Enter key, with the focus back on the trigger.
await send("Runtime.evaluate", {
  expression: `document.querySelector('header button[aria-controls]').focus()`,
});
// The documented recipe for a key that has a default action: a key down with
// the character, then the key up.
await send("Input.dispatchKeyEvent", {
  type: "keyDown",
  key: "Enter",
  code: "Enter",
  windowsVirtualKeyCode: 13,
  nativeVirtualKeyCode: 13,
  text: "\r",
  unmodifiedText: "\r",
});
await send("Input.dispatchKeyEvent", {
  type: "keyUp",
  key: "Enter",
  code: "Enter",
  windowsVirtualKeyCode: 13,
  nativeVirtualKeyCode: 13,
});
await new Promise((resolve) => setTimeout(resolve, 700));
await read("enter \\r: ");

// The Space key, which is the other way a native button is activated.
await send("Runtime.evaluate", {
  expression: `document.querySelector('header button[aria-controls]').focus()`,
});
await send("Input.dispatchKeyEvent", {
  type: "rawKeyDown",
  key: " ",
  code: "Space",
  windowsVirtualKeyCode: 32,
  nativeVirtualKeyCode: 32,
});
await send("Input.dispatchKeyEvent", {
  type: "keyUp",
  key: " ",
  code: "Space",
  windowsVirtualKeyCode: 32,
  nativeVirtualKeyCode: 32,
});
await new Promise((resolve) => setTimeout(resolve, 700));
await read("space:    ");

ws.close();
