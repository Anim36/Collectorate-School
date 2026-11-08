/**
 * Types into the notice editor and checks that the body follows, and that
 * opening another notice from the list loads its body into the editor.
 *
 * Usage: node scripts/check-notice-editor-typing.mjs [width]
 */
const width = Number(process.argv[2] ?? 1440);

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
  width,
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
});

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) return { error: result.exceptionDetails.text };
  return result.result.value;
}

await send("Page.navigate", { url: "http://localhost:3111/admin/notices" });
await new Promise((resolve) => setTimeout(resolve, 3000));

console.log(`=== typing in the notice editor @ ${width}px ===\n`);

console.log(
  "1. the body before typing:",
  JSON.stringify(
    await evaluate(
      `document.querySelector('[aria-label="Notice body"]')?.textContent.trim().slice(0, 50)`,
    ),
  ),
);

console.log(
  "2. type at the end of the body:",
  await evaluate(`(() => {
    const area = document.querySelector('[aria-label="Notice body"]');
    if (!area) return "no area";
    area.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(area);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    return "focused at the end";
  })()`),
);

await send("Input.insertText", { text: " Typed." });
await new Promise((resolve) => setTimeout(resolve, 800));

console.log(
  "3. the body after typing:",
  JSON.stringify(
    await evaluate(
      `document.querySelector('[aria-label="Notice body"]')?.textContent.trim().slice(-40)`,
    ),
  ),
);

console.log(
  "4. toggle bold and type:",
  await evaluate(`(() => {
    const area = document.querySelector('[aria-label="Notice body"]');
    if (!area) return "no area";
    area.focus();
    const btn = [...document.querySelectorAll('button[aria-label="Bold"]')][0];
    btn.click();
    return "bold on";
  })()`),
);
await new Promise((resolve) => setTimeout(resolve, 400));

await send("Input.insertText", { text: "Bold word. " });
await new Promise((resolve) => setTimeout(resolve, 800));

console.log(
  "5. the body has a strong tag:",
  await evaluate(
    `document.querySelector('[aria-label="Notice body"] strong')?.textContent ?? "none"`,
  ),
);
console.log(
  "   the bold button is pressed:",
  await evaluate(
    `document.querySelector('button[aria-label="Bold"]')?.getAttribute("aria-pressed")`,
  ),
);

console.log(
  "6. open another notice from the list:",
  await evaluate(`(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "List"
    );
    if (!btn) return "no button";
    btn.click();
    return "clicked";
  })()`),
);
await new Promise((resolve) => setTimeout(resolve, 700));

await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].filter(
    (b) => b.textContent.trim() === "Edit"
  )[1];
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 900));

console.log(
  "   the title:",
  await evaluate(
    `[...document.querySelectorAll("input, textarea")].map((el) => el.value).filter(Boolean)[0]`,
  ),
);
console.log(
  "   the body:",
  JSON.stringify(
    await evaluate(
      `document.querySelector('[aria-label="Notice body"]')?.textContent.trim().slice(0, 50)`,
    ),
  ),
);

ws.close();
