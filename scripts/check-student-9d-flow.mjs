/**
 * Checks the interactive behaviour of the step 9D pages: the payment method
 * page takes the details of the method, records the payment and hands over to
 * the receipt page.
 *
 * Usage: node scripts/check-student-9d-flow.mjs
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
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});

let failures = 0;

function check(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label.padEnd(22)} ${detail}`);
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result.value;
}

/* ------------------------------------------------- the method page opens -- */

await send("Page.navigate", {
  url: "http://localhost:3111/student/fees/pay?fee=all-fees&method=bkash",
});
await new Promise((resolve) => setTimeout(resolve, 2500));

const methodPage = await evaluate(`(() => {
  const form = document.querySelector('[data-payment="form"]');
  const summary = document.querySelector('[data-payment="summary"]');
  return {
    heading: document.querySelector('main h2')?.textContent.trim(),
    summary: summary?.textContent.trim().replace(/\\s+/g, ' '),
    methods: Array.from(document.querySelectorAll('[role="radio"]')).map((el) => ({
      label: el.textContent.trim(),
      checked: el.getAttribute('aria-checked'),
    })),
    fields: Array.from(
      form?.querySelectorAll('input:not([type="hidden"])') ?? [],
    ).map((el) => el.getAttribute('name') ?? el.id),
    buttons: Array.from(form?.querySelectorAll('button') ?? []).map((el) =>
      el.textContent.trim(),
    ),
  };
})()`);

check(
  "methodHeading",
  methodPage.heading === "Payment method",
  `heading reads "${methodPage.heading}"`,
);

check(
  "methodSummary",
  methodPage.summary?.includes("Order summary") &&
    methodPage.summary?.includes("৳ 3,000"),
  methodPage.summary ?? "-",
);

check(
  "methodOptions",
  methodPage.methods.length === 3 &&
    methodPage.methods[0].label === "bKash" &&
    methodPage.methods[0].checked === "true" &&
    methodPage.methods[1].checked === "false",
  methodPage.methods.map((m) => `${m.label}[${m.checked}]`).join(" "),
);

check(
  "methodFields",
  methodPage.fields.includes("mobile") &&
    methodPage.fields.includes("transactionId"),
  methodPage.fields.join(", "),
);

check(
  "methodActions",
  methodPage.buttons.includes("Pay") &&
    methodPage.buttons.includes("Cancel"),
  methodPage.buttons.join(" | "),
);

/* ------------------------------------------------------ the method switch -- */

await evaluate(`(() => {
  const option = Array.from(document.querySelectorAll('[role="radio"]')).find(
    (el) => el.textContent.trim() === 'Debit / Credit Card',
  );
  option.click();
})()`);
await new Promise((resolve) => setTimeout(resolve, 500));

const cardFields = await evaluate(`(() => {
  const form = document.querySelector('[data-payment="form"]');
  return {
    checked: Array.from(document.querySelectorAll('[role="radio"]')).map((el) =>
      el.getAttribute('aria-checked'),
    ),
    fields: Array.from(
      form?.querySelectorAll('input:not([type="hidden"])') ?? [],
    ).map((el) => el.getAttribute('name') ?? el.id),
  };
})()`);

check(
  "methodCardFields",
  cardFields.checked[2] === "true" &&
    cardFields.fields.includes("cardNumber") &&
    cardFields.fields.includes("cardCvc"),
  cardFields.fields.join(", "),
);

/* ------------------------------------------------------- the validation -- */

await evaluate(`(() => {
  const form = document.querySelector('[data-payment="form"] form');
  form.requestSubmit();
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));

const errors = await evaluate(`(() => {
  const form = document.querySelector('[data-payment="form"] form');
  return Array.from(form?.querySelectorAll('p, [role="alert"]') ?? [])
    .map((el) => el.textContent.trim())
    .filter((text) => text.length > 0);
})()`);

check(
  "methodValidation",
  errors.length > 0,
  errors.length ? errors.join(" | ") : "no message shown",
);

/* ------------------------------------------------------ the happy path -- */

// Go back to bKash and pay with a valid number.
await evaluate(`(() => {
  const option = Array.from(document.querySelectorAll('[role="radio"]')).find(
    (el) => el.textContent.trim() === 'bKash',
  );
  option.click();
})()`);
await new Promise((resolve) => setTimeout(resolve, 400));

await evaluate(`(() => {
  const form = document.querySelector('[data-payment="form"] form');
  const set = (name, value) => {
    const input = form.querySelector('[name="' + name + '"]');
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    ).set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  set('mobile', '01712345678');
  set('transactionId', '9F7K2M4XQ1');
})()`);
await new Promise((resolve) => setTimeout(resolve, 400));

await evaluate(`(() => {
  const form = document.querySelector('[data-payment="form"] form');
  form.requestSubmit();
})()`);
await new Promise((resolve) => setTimeout(resolve, 3500));

const receipt = await evaluate(`(() => {
  const card = document.querySelector('[data-receipt="card"]');
  return {
    path: location.pathname,
    card: card?.textContent.trim().replace(/\\s+/g, ' '),
    heading: card?.querySelector('h3')?.textContent.trim(),
    actions: Array.from(card?.querySelectorAll('button') ?? []).map((el) =>
      el.textContent.trim(),
    ),
  };
})()`);

check(
  "receiptRoute",
  receipt.path.startsWith("/student/fees/receipt/"),
  `landed on ${receipt.path}`,
);

check(
  "receiptCard",
  receipt.heading?.replace(/\s+/g, "") === "✓Paymentsuccessful" &&
    receipt.card?.includes("৳ 3,000"),
  receipt.card ?? "-",
);

check(
  "receiptActions",
  receipt.actions.length === 1 &&
    receipt.actions[0] === "Download receipt",
  receipt.actions.join(" | "),
);

/* ------------------------------------------- the fee is marked as paid -- */

// The store lives in the page, so the fees page is opened with a client-side
// navigation: a reload would start the mock over.
await evaluate(`(() => {
  const link = Array.from(document.querySelectorAll('a')).find((el) =>
    el.getAttribute('href') === '/student/fees',
  );
  link.click();
})()`);
await new Promise((resolve) => setTimeout(resolve, 2500));

const fees = await evaluate(`(() => {
  const rows = Array.from(document.querySelectorAll('main table tbody tr'));
  const history = Array.from(
    document.querySelectorAll('main table'),
  )[1]?.querySelectorAll('tbody tr');
  return {
    due: Array.from(rows[0]?.querySelectorAll('td') ?? [])
      .map((cell) => cell.textContent.trim())
      .join(' | '),
    history: Array.from(history ?? []).map((row) =>
      Array.from(row.querySelectorAll('td'))
        .map((cell) => cell.textContent.trim())
        .join(' | '),
    ),
  };
})()`);

check(
  "feesMarkedPaid",
  fees.due.includes("Paid"),
  fees.due || "-",
);

check(
  "feesHistory",
  fees.history[0]?.includes("RCPT-2026-1104") &&
    fees.history[0]?.includes("bKash"),
  fees.history[0] ?? "-",
);

console.log(
  failures === 0
    ? "\nAll student 9D flow checks passed."
    : `\n${failures} flow check(s) failed.`,
);

ws.close();
process.exit(failures === 0 ? 0 : 1);
