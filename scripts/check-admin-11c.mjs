/**
 * Checks the step 11C behaviours: the fees filters, the fee structure editor,
 * the mark-as-paid action, the payments to verify and the audit log filters and
 * pagination.
 *
 * The check drives the pages in the debug browser, so it needs the server on
 * port 3111 and Chrome on the DevTools Protocol port 9222, and the browser
 * has to be signed in as an admin (see `scripts/qa/session.mjs`).
 *
 * The check changes rows of the school, so it puts them back the way the
 * seed describes them when it is done.
 *
 * Usage: node scripts/check-admin-11c.mjs [width]
 */
const width = Number(process.argv[2] ?? 1440);

/**
 * The transaction id the check records its payment with.
 *
 * The prefix is what the cleanup looks for, so the payment the check makes is
 * taken off again and the school is left as the seed describes it.
 */
const TRANSACTION_ID = "b3c-check-TX-1";

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

/**
 * Opens the status dropdown.
 */
const openDropdown = () => `(() => {
  document.querySelector('[role="combobox"]').click();
  return true;
})()`;

async function chooseOption(label) {
  await evaluate(openDropdown());
  await new Promise((resolve) => setTimeout(resolve, 600));
  await evaluate(`(() => {
    const option = [...document.querySelectorAll('[role="option"]')].find((o) =>
      o.textContent.trim() === ${JSON.stringify(label)},
    );
    if (!option) return "not found";
    option.click();
    return "clicked";
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 900));
}

console.log(`=== admin 11C behaviours @ ${width}px ===\n`);

/* ----------------------------------------------------------------- fees --- */

await goto("/admin/fees");

const feeRows = await evaluate(`(() => {
  const tables = [...document.querySelectorAll("table")];
  return {
    feeRows: tables[0].querySelectorAll("tbody tr").length,
    feeHead: [...tables[0].querySelectorAll("thead th")].map((th) => th.textContent.trim()),
    paymentRows: tables[1].querySelectorAll("tbody tr").length,
    paymentHead: [...tables[1].querySelectorAll("thead th")].map((th) => th.textContent.trim()),
    footer: tables[1].parentElement.textContent.includes("Showing 3 records"),
    classes: [...tables[0].querySelectorAll("tbody tr")].map((tr) =>
      tr.children[0].textContent.trim(),
    ),
  };
})()`);

check(
  "the fee structure holds a row for every class that has one",
  feeRows.feeRows === 12,
  `rows ${feeRows.feeRows}`,
);
check(
  "the fee structure reads Class, Monthly tuition, Admission fee and Activities",
  feeRows.feeHead.join(",") ===
    "Class,Monthly tuition,Admission fee,Activities",
  feeRows.feeHead.join(","),
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
await chooseOption("Paid");

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
  paidOnly.rows > 0 && paidOnly.statuses.every((s) => s === "Paid"),
  JSON.stringify(paidOnly.statuses),
);

// The search narrows the table. The school holds more than one student with
// a given name, so the search is checked by the student id, which is unique.
// The status filter is put back to "All" first, so the search is not
// narrowed by the filter as well.
await chooseOption("All payment statuses");
await evaluate(setSearch("ST-2026-0042"));
await new Promise((resolve) => setTimeout(resolve, 900));

const searched = await evaluate(`(() => {
  const tables = [...document.querySelectorAll("table")];
  return {
    rows: tables[1].querySelectorAll("tbody tr").length,
    students: [...tables[1].querySelectorAll("tbody tr")].map((tr) =>
      tr.children[0].textContent.trim(),
    ),
  };
})()`);

check(
  "the search box narrows the payments to the matching student",
  searched.rows > 0 && searched.students.every((s) => s === "Arif Hasan"),
  JSON.stringify(searched),
);

// The mark-as-paid action opens the dialog. The student that was searched for
// is kept on screen, so the line the check pays is one the seed put back to
// due and one the cleanup can undo.
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
    fields: [...el.querySelectorAll("input")].map((i) => ({
      label: i.getAttribute("aria-label"),
      type: i.getAttribute("type"),
      value: i.value,
    })),
  };
})()`);

check(
  "the mark-as-paid action opens the receipt dialog",
  opened === "clicked" && dialog?.title === "Mark as paid",
  JSON.stringify(dialog?.fields),
);

check(
  "the dialog never asks for the whole card number",
  !(dialog?.fields ?? []).some(
    (field) =>
      field.label === "Card number" || field.label === "Security code",
  ),
  JSON.stringify((dialog?.fields ?? []).map((field) => field.label)),
);

// Recording a payment marks it as paid. The receipt number is handed out by
// the server, so the check reads it back instead of typing one in. The
// transaction id carries the prefix the cleanup looks for, so the payment the
// check makes is taken off again afterwards.
await evaluate(`(() => {
  const el = document.querySelector('[role="dialog"]');
  const radio = [...el.querySelectorAll('input[type="radio"]')].find(
    (r) => r.value === "BKASH",
  );
  radio.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 500));

await evaluate(`(() => {
  const el = document.querySelector('[role="dialog"]');
  const input = [...el.querySelectorAll("input")].find(
    (i) => i.getAttribute("aria-label") === "Transaction id",
  );
  if (!input) return "no field";
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, ${JSON.stringify(TRANSACTION_ID)});
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return "typed";
})()`);
await new Promise((resolve) => setTimeout(resolve, 400));
await evaluate(clickText("Record payment"));
await new Promise((resolve) => setTimeout(resolve, 1400));

const recorded = await evaluate(`(() => {
  const tables = [...document.querySelectorAll("table")];
  const row = [...tables[1].querySelectorAll("tbody tr")].find((tr) =>
    tr.children[5] && tr.children[5].textContent.trim().startsWith("RCPT-"),
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
  recorded.status === "Paid" && recorded.receipt.startsWith("RCPT-"),
  JSON.stringify({ status: recorded.status, receipt: recorded.receipt }),
);
check(
  "recording a payment raises a toast",
  recorded.toast.some((t) => t.includes("Payment recorded")),
  JSON.stringify(recorded.toast),
);

// The fee structure editor saves the changed amount.
await evaluate(clickText("Edit fee structure"));
await new Promise((resolve) => setTimeout(resolve, 900));

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
  "the edit action opens the fee structure dialog with the class fees",
  feeDialog?.title === "Edit fee structure" &&
    feeDialog.fields.some((f) => f.value !== "" && f.value !== "2026-11-10"),
  JSON.stringify(feeDialog?.fields),
);

const tuitionBefore = feeDialog?.fields.find(
  (f) => f.label === "Monthly tuition",
)?.value;

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
await new Promise((resolve) => setTimeout(resolve, 1200));

const savedFee = await evaluate(`(() => {
  const tables = [...document.querySelectorAll("table")];
  return tables[0].querySelector("tbody tr")?.children[1].textContent.trim();
})()`);

check(
  "the edited tuition appears in the fee structure table",
  savedFee === "৳ 1,700",
  `cell "${savedFee}" (was ${tuitionBefore})`,
);

// The queue of the payments that wait for the admin.
await evaluate(clickText("Payments to verify"));
await new Promise((resolve) => setTimeout(resolve, 900));

const queue = await evaluate(`(() => {
  const el = document.querySelector('[role="dialog"]');
  if (!el) return null;
  return {
    title: el.querySelector("h2")?.textContent.trim(),
    items: [...el.querySelectorAll("li")].map((li) => li.textContent.trim()),
    buttons: [...el.querySelectorAll("button")].map((b) => b.textContent.trim()),
  };
})()`);

check(
  "the queue of the payments to verify opens",
  queue?.title === "Payments to verify",
  JSON.stringify(queue?.title),
);
check(
  "the queue lists the payments that wait for the admin",
  (queue?.items ?? []).length > 0 &&
    (queue?.buttons ?? []).includes("Approve") &&
    (queue?.buttons ?? []).includes("Reject"),
  `${(queue?.items ?? []).length} payment(s)`,
);

// The rejection needs a reason.
await evaluate(clickText("Reject"));
await new Promise((resolve) => setTimeout(resolve, 600));

const rejection = await evaluate(`(() => {
  const el = document.querySelector('[role="dialog"]');
  const textarea = el.querySelector("textarea");
  return {
    title: el.querySelector("h2")?.textContent.trim(),
    hasReason: Boolean(textarea),
    buttons: [...el.querySelectorAll("button")].map((b) => b.textContent.trim()),
  };
})()`);

check(
  "the rejection asks why the payment was refused",
  rejection.hasReason === true &&
    (rejection.buttons ?? []).includes("Reject payment"),
  JSON.stringify(rejection.buttons),
);

await evaluate(clickText("Cancel"));
await new Promise((resolve) => setTimeout(resolve, 500));
await evaluate(`(() => {
  const el = document.querySelector('[role="dialog"]');
  const close = [...el.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Close",
  );
  if (close) close.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));

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
await chooseOption("Fee");

const feeOnly = await evaluate(`(() => {
  const table = document.querySelector("table");
  return {
    rows: table.querySelectorAll("tbody tr").length,
    actions: [...table.querySelectorAll("tbody tr")].map((tr) =>
      tr.children[2].textContent.trim(),
    ),
  };
})()`);

check(
  "the Fee filter keeps only the fee events",
  feeOnly.rows > 0 &&
    feeOnly.actions.every((a) => a.toLowerCase().includes("fee")),
  JSON.stringify(feeOnly.actions),
);

// The search narrows the log.
await evaluate(setSearch("attendance"));
await new Promise((resolve) => setTimeout(resolve, 900));

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
await new Promise((resolve) => setTimeout(resolve, 700));
await chooseOption("All actions");

const pageTwo = await evaluate(`(() => {
  const nav = document.querySelector('nav[aria-label="Pagination"]');
  const next = [...nav.querySelectorAll("button")].find(
    (b) => b.getAttribute("aria-label") === "Next page",
  );
  next.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 900));

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

/* --------------------------------------------------------------- cleanup --- */

// The check changed rows of the school, so they are put back the way the
// seed describes them.
const { execFileSync } = await import("node:child_process");
const { join } = await import("node:path");

console.log("");

execFileSync(
  process.execPath,
  [
    join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
    "scripts/qa/restore-seed-state.ts",
  ],
  { stdio: "inherit" },
);

process.exit(failed.length === 0 ? 0 : 1);
