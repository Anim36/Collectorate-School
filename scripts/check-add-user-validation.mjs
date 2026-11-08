/**
 * Checks the add-user zod rules: bad email, short password and a student
 * without a class.
 *
 * Usage: node scripts/check-add-user-validation.mjs
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
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3111/admin/users" });
await new Promise((resolve) => setTimeout(resolve, 2200));

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result.value;
}

const setLabelled = (label, value) => `(() => {
  const el = [...document.querySelectorAll("label")]
    .find((l) => l.textContent.trim() === ${JSON.stringify(label)})
    ?.getAttribute("for");
  if (!el) return "no label";
  const input = document.getElementById(el);
  if (!input) return "no input";
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value"
  ).set;
  setter.call(input, ${JSON.stringify(value)});
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return "ok";
})()`;

/** The validation messages under the form fields. */
const fieldErrors = `(() => {
  const form = document.querySelector('#admin-add-user');
  if (!form) return null;
  const out = {};
  for (const label of form.querySelectorAll('label')) {
    const id = label.getAttribute('for');
    if (!id) continue;
    const field = document.getElementById(id);
    const wrap = field?.closest('div');
    const message = [...(wrap?.querySelectorAll('p') ?? [])]
      .map((p) => p.textContent.trim())
      .find((t) => t.length > 0);
    if (message) out[label.textContent.trim()] = message;
  }
  const classNote = [...form.querySelectorAll('p')]
    .map((p) => p.textContent.trim())
    .find((t) => t.startsWith('Pick a') || t.startsWith('Enter a valid') || t.startsWith('Use at least'));
  if (classNote) out['Class & section'] = classNote;
  return out;
})()`;

const openDialog = `(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Add User"
  );
  btn.click();
  return "clicked";
})()`;

const submit = `(() => {
  document.querySelector("#admin-add-user").requestSubmit();
  return "submitted";
})()`;

await evaluate(openDialog);
await new Promise((resolve) => setTimeout(resolve, 700));

// A student with everything but a class.
await evaluate(setLabelled("Full name", "Sadia Rahman"));
await evaluate(setLabelled("Email", "sadia.rahman@example.com"));
await evaluate(setLabelled("Temporary password", "School@2026!Change"));
await new Promise((resolve) => setTimeout(resolve, 400));
await evaluate(submit);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("student, no class:  ", JSON.stringify(await evaluate(fieldErrors)));

// A bad email.
await evaluate(setLabelled("Email", "not-an-email"));
await new Promise((resolve) => setTimeout(resolve, 500));
console.log("bad email:          ", JSON.stringify(await evaluate(fieldErrors)));

// A short password.
await evaluate(setLabelled("Email", "sadia.rahman@example.com"));
await evaluate(setLabelled("Temporary password", "short"));
await new Promise((resolve) => setTimeout(resolve, 500));
console.log("short password:     ", JSON.stringify(await evaluate(fieldErrors)));

// The dialog must still be open — nothing was created.
console.log("dialog still open:  ", await evaluate(`document.querySelector('[role="dialog"]') !== null`));
console.log(
  "rows in the table:  ",
  await evaluate(`document.querySelectorAll('table tbody tr').length`),
);

ws.close();
