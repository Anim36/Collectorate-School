/**
 * Checks the interactive behaviour of the step 9 student pages: the result
 * exam selector, the fee payment modal and the buttons that only show UI
 * states.
 *
 * Usage: node scripts/check-student-9b.mjs
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

async function visit(route) {
  await send("Page.navigate", { url: `http://localhost:3111${route}` });
  await new Promise((resolve) => setTimeout(resolve, 2200));
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });
  return result.result.value;
}

/* --------------------------------------------------------------- result -- */

await visit("/student/result");

const firstTable = await evaluate(`(() => {
  const rows = Array.from(document.querySelectorAll('main table tbody tr'));
  return rows.map((row) =>
    Array.from(row.querySelectorAll('td'))
      .map((cell) => cell.textContent.trim())
      .join(' | '),
  );
})()`);

check(
  "resultFirstExam",
  firstTable.length === 8 && firstTable[0] === "Bangla | 86 | A+ | 5.00",
  `${firstTable.length} rows, first is "${firstTable[0]}"`,
);

// Open the exam selector and pick the mid-term exam.
await evaluate(`document.querySelector('#result-exam').click()`);
await new Promise((resolve) => setTimeout(resolve, 500));

const options = await evaluate(`(() => {
  return Array.from(document.querySelectorAll('[role="option"]')).map((el) =>
    el.textContent.trim(),
  );
})()`);

check(
  "resultOptions",
  options.length === 3 &&
    options[0] === "Half-yearly examination 2026" &&
    options[1] === "Mid-term examination 2026",
  `${options.length} options: ${options.join(" | ")}`,
);

await evaluate(`(() => {
  const option = Array.from(document.querySelectorAll('[role="option"]')).find(
    (el) => el.textContent.trim() === 'Mid-term examination 2026',
  );
  option.click();
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));

const afterSwitch = await evaluate(`(() => {
  const trigger = document.querySelector('#result-exam');
  const rows = Array.from(document.querySelectorAll('main table tbody tr'));
  const overall = Array.from(document.querySelectorAll('main section')).find(
    (el) => el.textContent.includes('/ 5.00'),
  );
  return {
    trigger: trigger.textContent.trim().replace(/\\s+/g, ' '),
    firstRow: Array.from(rows[0]?.querySelectorAll('td') ?? [])
      .map((cell) => cell.textContent.trim())
      .join(' | '),
    overall: overall?.textContent.trim().replace(/\\s+/g, ' '),
  };
})()`);

check(
  "resultSelector",
  afterSwitch.trigger === "Mid-term examination 2026",
  `trigger reads "${afterSwitch.trigger}"`,
);

check(
  "resultTableChanges",
  afterSwitch.firstRow === "Bangla | 84 | A+ | 5.00",
  `first row is "${afterSwitch.firstRow}" (was "${firstTable[0]}")`,
);

check(
  "resultGpaCard",
  afterSwitch.overall?.startsWith("4.75 / 5.00") &&
    afterSwitch.overall?.includes("Total marks: 657 / 800"),
  `overall card reads "${afterSwitch.overall}"`,
);

const downloadButton = await evaluate(`(() => {
  const button = Array.from(document.querySelectorAll('main button')).find((el) =>
    el.textContent.includes('Download Result'),
  );
  return button
    ? { label: button.textContent.trim(), tag: button.tagName, type: button.type }
    : null;
})()`);

check(
  "resultDownload",
  downloadButton?.tag === "BUTTON" && downloadButton.type === "button",
  downloadButton ? `${downloadButton.tag}[${downloadButton.type}]` : "absent",
);

/* ----------------------------------------------------------------- fees -- */

await visit("/student/fees");

const modalBefore = await evaluate(
  `document.querySelectorAll('[role="dialog"]').length`,
);
check("feesModalClosed", modalBefore === 0, `${modalBefore} dialogs before`);

await evaluate(`(() => {
  const button = Array.from(document.querySelectorAll('main button')).find((el) =>
    el.textContent.includes('Pay Now'),
  );
  button.click();
})()`);
await new Promise((resolve) => setTimeout(resolve, 500));

const modal = await evaluate(`(() => {
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return null;
  const options = Array.from(dialog.querySelectorAll('[role="radio"]'));
  const buttons = Array.from(dialog.querySelectorAll('button'));
  return {
    title: dialog.querySelector('h2')?.textContent.trim(),
    description: dialog.querySelector('p')?.textContent.trim(),
    options: options.map((el) => ({
      label: el.textContent.trim(),
      checked: el.getAttribute('aria-checked'),
    })),
    buttons: buttons.map((el) => el.textContent.trim()),
  };
})()`);

check(
  "feesModalOpen",
  modal?.title === "Choose a payment method" &&
    modal?.description === "Secure payment · Total ৳ 3,000",
  modal ? `title "${modal.title}" / "${modal.description}"` : "no dialog",
);

check(
  "feesModalOptions",
  modal?.options.length === 3 &&
    modal.options[0].label === "bKash" &&
    modal.options[0].checked === "true" &&
    modal.options[1].checked === "false" &&
    modal.options[2].label === "Debit / Credit Card",
  modal ? modal.options.map((o) => `${o.label}[${o.checked}]`).join(" ") : "-",
);

check(
  "feesModalActions",
  modal?.buttons.includes("Continue to bKash") && modal?.buttons.includes("Cancel"),
  modal ? modal.buttons.join(" | ") : "-",
);

// Pick Nagad and check the continue button follows.
await evaluate(`(() => {
  const dialog = document.querySelector('[role="dialog"]');
  const option = Array.from(dialog.querySelectorAll('[role="radio"]')).find(
    (el) => el.textContent.trim() === 'Nagad',
  );
  option.click();
})()`);
await new Promise((resolve) => setTimeout(resolve, 400));

const afterPick = await evaluate(`(() => {
  const dialog = document.querySelector('[role="dialog"]');
  const options = Array.from(dialog.querySelectorAll('[role="radio"]'));
  const buttons = Array.from(dialog.querySelectorAll('button'));
  return {
    checked: options.map((el) => el.getAttribute('aria-checked')),
    continueLabel: buttons.map((el) => el.textContent.trim()).find((t) =>
      t.startsWith('Continue to'),
    ),
  };
})()`);

check(
  "feesMethodSwitch",
  afterPick.checked[1] === "true" &&
    afterPick.continueLabel === "Continue to Nagad",
  `checked ${afterPick.checked.join(",")} / "${afterPick.continueLabel}"`,
);

// Cancel closes the modal.
await evaluate(`(() => {
  const dialog = document.querySelector('[role="dialog"]');
  const cancel = Array.from(dialog.querySelectorAll('button')).find((el) =>
    el.textContent.trim() === 'Cancel',
  );
  cancel.click();
})()`);
await new Promise((resolve) => setTimeout(resolve, 400));

const modalAfter = await evaluate(
  `document.querySelectorAll('[role="dialog"]').length`,
);
check("feesModalClosed", modalAfter === 0, `${modalAfter} dialogs after cancel`);

const receiptButton = await evaluate(`(() => {
  const button = Array.from(document.querySelectorAll('main button')).find((el) =>
    el.textContent.includes('Download receipt'),
  );
  return button ? { label: button.textContent.trim(), tag: button.tagName } : null;
})()`);

check(
  "feesReceiptButton",
  receiptButton?.tag === "BUTTON",
  receiptButton ? `${receiptButton.tag} "${receiptButton.label}"` : "absent",
);

/* ----------------------------------------------------------- performance -- */

await visit("/student/performance");

const chart = await evaluate(`(() => {
  const svg = document.querySelector('main section svg.recharts-surface');
  const bars = document.querySelectorAll('main [role="img"]');
  return {
    hasChart: Boolean(svg),
    line: document.querySelectorAll('.recharts-line').length,
    gridlines: document.querySelectorAll('.recharts-cartesian-grid line').length,
    images: bars.length,
  };
})()`);

check(
  "performanceChart",
  chart.hasChart && chart.line > 0 && chart.gridlines >= 4,
  `line=${chart.line} gridlines=${chart.gridlines}`,
);

const subjectBars = await evaluate(`(() => {
  const bars = Array.from(document.querySelectorAll('main [role="img"]')).filter(
    (el) => el.querySelector('span'),
  );
  return bars.map((el) => ({
    label: el.getAttribute('aria-label'),
    width: Math.round(el.querySelector('span').getBoundingClientRect().width),
    track: Math.round(el.getBoundingClientRect().width),
  }));
})()`);

check(
  "performanceBars",
  subjectBars.length === 8 &&
    subjectBars.every((bar) => {
      const match = bar.label.match(/(\d+) out of 100/);
      if (!match) return false;
      return Math.abs(bar.width / bar.track - Number(match[1]) / 100) < 0.02;
    }),
  subjectBars
    .slice(0, 3)
    .map((bar) => `${bar.label} ${bar.width}/${bar.track}`)
    .join(" | "),
);

console.log(
  failures === 0
    ? "\nAll student 9B behaviour checks passed."
    : `\n${failures} behaviour check(s) failed.`,
);

ws.close();
process.exit(failures === 0 ? 0 : 1);
