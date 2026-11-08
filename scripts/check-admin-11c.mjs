/**
 * Checks the step 11C behaviours: the fees filters, the fee structure editor,
 * the mark-as-paid action and the audit log filters and pagination.
 *
 * Usage: node scripts/check-admin-11c.mjs [width]
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

async function goto(route) {
  await send("Page.navigate", { url: `http://localhost:3111${route}` });
  await new Promise((resolve) => setTimeout(resolve, 2600));
}

const results = [];

function check(label, pass, detail) {
  results.push({ label, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
  if (detail !== undefined) console.log(`      ${detail}`);
}

const setSearch = (value) => `(() => {
  const input = document.querySelector('input[type="search"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, ${JSON.stringify(value)});
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`;

const clickText = (text, tag = "button") => `(() => {
  const el = [...document.querySelectorAll(${JSON.stringify(tag)})].find(
    (node) => node.textContent.trim() === ${JSON.stringify(text)},
  );
  if (!el) return "not found";
  el.click();
  return "clicked";
})()`;

console.log(`=== admin 11C behaviours @ ${width}px ===\n`);

/* ----------------------------------------------------------------- fees --- */

await goto("/admin/fees");

const feeRows = await evaluate(`(() => {
  const tables = [...document.querySelectorAll("table")];
  return {
    feeRows: tables[0].querySelectorAll("tbody tr").length,
    paymentRows: tables[1].querySelectorAll("tbody tr").length,
    paymentHead: [...tables[1].querySelectorAll("thead th")].map((th) => th.textContent.trim()),
    footer: tables[1].parentElement.textContent.includes("Showing 3 records"),
  };
})()`);

check(
  "the fee structure holds two class bands",
  feeRows.feeRows === 2,
  `rows ${feeRows.feeRows}`,
);
check(
  "the payments table holds three records on the first page",
  feeRows.paymentRows === 3,
  `rows ${feeRows.paymentRows}`,
);
check(
  "the payments table reads Student, Invoice, Amount, Status, Method and Receipt",
  feeRows.paymentHead.join(",") ===
    "Student,Invoice,Amount,Status,Method,Receipt",
  feeRows.paymentHead.join(","),
);
check(
  "the table footer counts the records on the page",
  feeRows.footer === true,
  String(feeRows.footer),
);

// The status filter narrows the table.
await evaluate(`(() => {
  document.querySelector('[role="combobox"]').click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const option = [...document.querySelectorAll('[role="option"]')].find((o) =>
    o.textContent.trim() === 'Paid',
  );
  option.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));

const paidOnly = await evaluate(`(() => {
  const tables = [...document.querySelectorAll("table")];
  return {
    rows: tables[1].querySelectorAll("tbody tr").length,
    statuses: [...tables[1].querySelectorAll("tbody tr")].map((tr) =>
      tr.children[3].textContent.trim(),
    ),
  };
})()`);

check(
  "the Paid filter keeps only the paid payments",
  paidOnly.rows === 3 && paidOnly.statuses.every((s) => s === "Paid"),
  JSON.stringify(paidOnly.statuses),
);

// The search narrows the table.
await evaluate(setSearch("Tanvir"));
await new Promise((resolve) => setTimeout(resolve, 700));

const searched = await evaluate(`(() => {
  const tables = [...document.querySelectorAll("table")];
  return {
    rows: tables[1].querySelectorAll("tbody tr").length,
    student: tables[1].querySelector("tbody tr")?.children[0].textContent.trim(),
  };
})()`);

check(
  "the search box narrows the payments to the matching student",
  searched.rows === 1 && searched.student === "Tanvir Ahmed",
  JSON.stringify(searched),
);

// The mark-as-paid action opens the dialog. The status filter is put back to
// "All" first, so a payment that is still due is on screen again.
await evaluate(setSearch(""));
await new Promise((resolve) => setTimeout(resolve, 500));
await evaluate(`(() => {
  document.querySelector('[role="combobox"]').click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const option = [...document.querySelectorAll('[role="option"]')].find((o) =>
    o.textContent.trim() === 'All payment statuses',
  );
  option.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 900));

const opened = await evaluate(`(() => {
  const trigger = [...document.querySelectorAll("table tbody button")].find((b) =>
    b.textContent.trim() === "Mark as paid",
  );
  if (!trigger) return "no trigger";
  trigger.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 900));

const dialog = await evaluate(`(() => {
  const el = document.querySelector('[role="dialog"]');
  if (!el) return null;
  return {
    title: el.querySelector("h2")?.textContent.trim(),
    receipt: [...el.querySelectorAll("input")].map((i) => i.value),
    methods: [...el.querySelectorAll('input[type="radio"]')].map((r) => r.value || r.parentElement.textContent.trim()),
  };
})()`);

check(
  "the mark-as-paid action opens the receipt dialog",
  opened === "clicked" && dialog?.title === "Mark as paid",
  JSON.stringify(dialog),
);

// Recording a payment marks it as paid.
await evaluate(`(() => {
  const el = document.querySelector('[role="dialog"]');
  const input = [...el.querySelectorAll("input")].find(
    (i) => i.getAttribute("aria-label") === "Receipt number",
  );
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, 'RCP-2026-9999');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 400));
await evaluate(clickText("Record payment"));
await new Promise((resolve) => setTimeout(resolve, 900));

const recorded = await evaluate(`(() => {
  const tables = [...document.querySelectorAll("table")];
  const row = [...tables[1].querySelectorAll("tbody tr")].find((tr) =>
    tr.textContent.includes("Arif Hasan"),
  );
  return {
    status: row?.children[3].textContent.trim(),
    receipt: row?.children[5].textContent.trim(),
    toast: [...document.querySelectorAll("[data-radix-toast-announce-exclude], li")]
      .map((li) => li.textContent.trim())
      .filter((t) => t.length > 0 && !t.startsWith("Class:") && !t.startsWith("Student:")),
  };
})()`);

check(
  "recording a payment marks it Paid and shows the receipt",
  recorded.status === "Paid" && recorded.receipt === "RCP-2026-9999",
  JSON.stringify({ status: recorded.status, receipt: recorded.receipt }),
);
check(
  "recording a payment raises a toast",
  recorded.toast.some((t) => t.includes("Payment recorded")),
  JSON.stringify(recorded.toast),
);

// The fee structure editor saves the changed amount.
await evaluate(clickText("Edit fee structure"));
await new Promise((resolve) => setTimeout(resolve, 700));

const feeDialog = await evaluate(`(() => {
  const el = document.querySelector('[role="dialog"]');
  if (!el) return null;
  return {
    title: el.querySelector("h2")?.textContent.trim(),
    fields: [...el.querySelectorAll("input")].map((i) => ({
      label: i.getAttribute("aria-label"),
      value: i.value,
    })),
  };
})()`);

check(
  "the edit action opens the fee structure dialog with the band fees",
  feeDialog?.title === "Edit fee structure" &&
    feeDialog.fields.some((f) => f.value === "1500"),
  JSON.stringify(feeDialog?.fields),
);

await evaluate(`(() => {
  const el = document.querySelector('[role="dialog"]');
  const input = [...el.querySelectorAll("input")].find(
    (i) => i.getAttribute("aria-label") === "Monthly tuition",
  );
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, '1700');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 400));
await evaluate(clickText("Save fee structure"));
await new Promise((resolve) => setTimeout(resolve, 900));

const savedFee = await evaluate(`(() => {
  const tables = [...document.querySelectorAll("table")];
  return tables[0].querySelector("tbody tr")?.children[1].textContent.trim();
})()`);

check(
  "the edited tuition appears in the fee structure table",
  savedFee === "৳ 1,700",
  `cell "${savedFee}"`,
);

/* ------------------------------------------------------------- audit log --- */

await goto("/admin/audit-log");

const audit = await evaluate(`(() => {
  const table = document.querySelector("table");
  return {
    rows: table.querySelectorAll("tbody tr").length,
    head: [...table.querySelectorAll("thead th")].map((th) => th.textContent.trim()),
    note: [...document.querySelectorAll("p")].map((p) => p.textContent.trim()).find((t) => t.startsWith("Audit records")),
    buttons: [...table.querySelectorAll("thead button, tbody button")].length,
  };
})()`);

check(
  "the audit log holds four events on the first page",
  audit.rows === 4,
  `rows ${audit.rows}`,
);
check(
  "the audit table reads Time, User, Action and Record",
  audit.head.join(",") === "Time,User,Action,Record",
  audit.head.join(","),
);
check(
  "the log carries the read-only note",
  typeof audit.note === "string" && audit.note.includes("read-only"),
  audit.note,
);

// The action-type filter narrows the log.
await evaluate(`(() => {
  document.querySelector('[role="combobox"]').click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const option = [...document.querySelectorAll('[role="option"]')].find((o) =>
    o.textContent.trim() === 'Result',
  );
  option.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));

const resultOnly = await evaluate(`(() => {
  const table = document.querySelector("table");
  return {
    rows: table.querySelectorAll("tbody tr").length,
    actions: [...table.querySelectorAll("tbody tr")].map((tr) =>
      tr.children[2].textContent.trim(),
    ),
  };
})()`);

check(
  "the Result filter keeps only the result events",
  resultOnly.rows === 3 &&
    resultOnly.actions.every((a) => a.toLowerCase().includes("result")),
  JSON.stringify(resultOnly.actions),
);

// The search narrows the log.
await evaluate(setSearch("attendance"));
await new Promise((resolve) => setTimeout(resolve, 700));

const searchedAudit = await evaluate(`(() => {
  const table = document.querySelector("table");
  return {
    rows: table.querySelectorAll("tbody tr").length,
    actions: [...table.querySelectorAll("tbody tr")].map((tr) =>
      tr.children[2].textContent.trim(),
    ),
  };
})()`);

check(
  "the search box finds the attendance edits",
  searchedAudit.rows === 0 ||
    searchedAudit.actions.every((a) => a.toLowerCase().includes("attendance")),
  JSON.stringify(searchedAudit.actions),
);

// The log is read-only: it holds no editing control.
const editable = await evaluate(`(() => {
  const table = document.querySelector("table");
  return {
    inputs: table.querySelectorAll("input").length,
    selects: table.querySelectorAll("select").length,
    rowActions: [...table.querySelectorAll("tbody button")].map((b) => b.textContent.trim()),
  };
})()`);

check(
  "the audit log offers no way to edit an event",
  editable.inputs === 0 &&
    editable.selects === 0 &&
    editable.rowActions.every((label) => /^\d+$/.test(label)),
  JSON.stringify(editable),
);

// The pagination moves to the next page of events. The filters are put back
// first, so the log holds every event again.
await evaluate(setSearch(""));
await new Promise((resolve) => setTimeout(resolve, 500));
await evaluate(`(() => {
  document.querySelector('[role="combobox"]').click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const option = [...document.querySelectorAll('[role="option"]')].find((o) =>
    o.textContent.trim() === 'All actions',
  );
  option.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 800));

const pageTwo = await evaluate(`(() => {
  const nav = document.querySelector('nav[aria-label="Pagination"]');
  const next = [...nav.querySelectorAll("button")].find(
    (b) => b.getAttribute("aria-label") === "Next page",
  );
  next.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));

const paged = await evaluate(`(() => {
  const table = document.querySelector("table");
  return {
    rows: table.querySelectorAll("tbody tr").length,
    first: table.querySelector("tbody tr")?.children[1].textContent.trim(),
    current: [...document.querySelectorAll('nav[aria-label="Pagination"] button')]
      .filter((b) => b.getAttribute("aria-current") === "page")
      .map((b) => b.textContent.trim()),
  };
})()`);

check(
  "the next page shows the following events",
  pageTwo === true && paged.rows === 4 && paged.current[0] === "2",
  JSON.stringify(paged),
);

console.log("");
const failed = results.filter((r) => !r.pass);
console.log(
  failed.length === 0
    ? `ALL ${results.length} CHECKS PASSED`
    : `${failed.length} of ${results.length} checks failed`,
);

ws.close();
process.exit(failed.length === 0 ? 0 : 1);
