/**
 * Checks the step 9D questions that the flow check does not cover: the print
 * run of the receipt, the links of the fees page and the card number.
 *
 * Usage: node scripts/check-student-9d-answers.mjs
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
  width: 1440,
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});

let failures = 0;

function check(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label.padEnd(24)} ${detail}`);
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result.value;
}

async function visit(route) {
  await send("Page.navigate", { url: `http://localhost:3111${route}` });
  await new Promise((resolve) => setTimeout(resolve, 2400));
}

/* ------------------------------------------------- (1) the print run -- */

await visit("/student/fees/receipt/RCPT-2026-1042");

// The download action of the receipt card must call the browser print flow.
const download = await evaluate(`(() => {
  const button = document.querySelector('[data-receipt="card"] button');
  if (!button) return null;
  let printed = false;
  window.print = () => { printed = true; };
  button.click();
  return { tag: button.tagName, type: button.type, printed };
})()`);

check(
  "printOpensFlow",
  download?.printed === true,
  download ? `${download.tag}[${download.type}] called window.print()` : "absent",
);

// The paper must hide the shell, the navigation and the actions. The print
// run is measured on the sheet itself, so the viewport becomes the A4 page.
const mm = 96 / 25.4;
const a4Width = Math.round(210 * mm - 32 * mm);
const a4Height = Math.round(297 * mm - 32 * mm);

await send("Emulation.setDeviceMetricsOverride", {
  width: a4Width,
  height: a4Height,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Emulation.setEmulatedMedia", { media: "print" });
await new Promise((resolve) => setTimeout(resolve, 500));

const printState = await evaluate(`(() => {
  // An element inside a hidden ancestor draws nothing, so the rendered boxes
  // are the honest measure.
  const hidden = (el) => !el || el.getClientRects().length === 0;
  const card = document.querySelector('[data-receipt="card"]');
  return {
    sidebar: hidden(document.querySelector('[data-portal="sidebar"]')),
    topBar: hidden(document.querySelector('[data-portal="top-bar"]')),
    bottomNav: hidden(document.querySelector('[data-portal="bottom-nav"]')),
    cardAction: hidden(card?.querySelector('button')),
    backLink: hidden(document.querySelector('main a[href="/student/fees"]')),
    cardWidth: Math.round(card?.getBoundingClientRect().width ?? 0),
  };
})()`);

check(
  "printHidesShell",
  printState.sidebar &&
    printState.topBar &&
    printState.bottomNav &&
    printState.cardAction &&
    printState.backLink,
  `sidebar ${printState.sidebar}, top bar ${printState.topBar}, bottom nav ${printState.bottomNav}, action ${printState.cardAction}, back ${printState.backLink}`,
);

// The paper is A4: the receipt must fit the sheet.
const paper = await evaluate(`(() => {
  const card = document.querySelector('[data-receipt="card"]');
  const details = document.querySelector('[data-receipt="details"]');
  const height =
    (card?.getBoundingClientRect().height ?? 0) +
    (details?.getBoundingClientRect().height ?? 0);
  return {
    a4Width: ${a4Width},
    a4Height: ${a4Height},
    contentHeight: Math.round(height),
    overflow: document.documentElement.scrollWidth > ${a4Width} + 1,
    scrollWidth: Math.round(document.documentElement.scrollWidth),
    scrollHeight: Math.ceil(document.documentElement.scrollHeight),
  };
})()`);

check(
  "printFitsA4",
  !paper.overflow &&
    paper.contentHeight <= paper.a4Height &&
    paper.scrollHeight <= paper.a4Height,
  `content ${paper.contentHeight}px, page ${paper.scrollHeight}px, sheet ${paper.a4Width}x${paper.a4Height}px`,
);

await send("Emulation.setEmulatedMedia", { media: "" });
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});

/* ------------------------------------------ (2) the fees page links -- */

// Pay with a card, so the receipt carries a card.
await visit("/student/fees/pay?fee=all-fees&method=card");
await new Promise((resolve) => setTimeout(resolve, 1200));

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
  set('cardNumber', '4111 1111 1111 1111');
  set('cardName', 'Arif Hasan');
  set('cardExpiry', '12/29');
  set('cardCvc', '123');
})()`);
await new Promise((resolve) => setTimeout(resolve, 400));

await evaluate(`(() => {
  document.querySelector('[data-payment="form"] form').requestSubmit();
})()`);
await new Promise((resolve) => setTimeout(resolve, 3500));

const afterCard = await evaluate(`(() => ({
  path: location.pathname,
  receipt: document.querySelector('[data-receipt="card"]')?.textContent
    .trim()
    .replace(/\\s+/g, ' '),
}))()`);

check(
  "cardReceiptRoute",
  afterCard.path === "/student/fees/receipt/RCPT-2026-1104",
  `landed on ${afterCard.path}`,
);

/* -------------------------------- (3) the card number is never stored -- */

const stored = await evaluate(`(() => {
  const html = document.documentElement.outerHTML;
  // The theme toggle is the only key the shell keeps.
  const localKeys = Object.keys(localStorage).filter((k) => k !== 'theme');
  return {
    htmlHasFullCard: html.includes('4111111111111111'),
    htmlHasSpacedCard: html.includes('4111 1111 1111 1111'),
    sessionKeys: Object.keys(sessionStorage),
    localKeys,
    storageDump: [...Object.entries(localStorage), ...Object.entries(sessionStorage)],
  };
})()`);

check(
  "cardNotInDom",
  !stored.htmlHasFullCard && !stored.htmlHasSpacedCard,
  `full number in the DOM: ${stored.htmlHasFullCard || stored.htmlHasSpacedCard}`,
);

check(
  "noStorageKeys",
  stored.sessionKeys.length === 0 && stored.localKeys.length === 0,
  `session [${stored.sessionKeys.join(",")}], local [${stored.localKeys.join(",")}]`,
);

// The receipt shows the last four digits and nothing else.
const receiptText = afterCard.receipt ?? "";
const detailsText = await evaluate(`(() =>
  document.querySelector('[data-receipt="details"]')?.textContent
    .trim()
    .replace(/\\s+/g, ' ') ?? ''
)()`);
const allText = `${receiptText} ${detailsText}`;

check(
  "cardLast4Only",
  allText.includes('1111') &&
    !allText.includes('4111 1111') &&
    !allText.includes('41111111'),
  `last four shown: ${allText.includes('1111')}, full number shown: ${allText.includes('4111 1111') || allText.includes('41111111')}`,
);

/* -------------------------- (2) the fees page after the payment -- */

await evaluate(`(() => {
  const link = Array.from(document.querySelectorAll('a')).find(
    (el) => el.getAttribute('href') === '/student/fees',
  );
  link.click();
})()`);
await new Promise((resolve) => setTimeout(resolve, 2500));

const fees = await evaluate(`(() => {
  const tables = Array.from(document.querySelectorAll('main table'));
  const rows = Array.from(tables[0]?.querySelectorAll('tbody tr') ?? []);
  const history = Array.from(tables[1]?.querySelectorAll('tbody tr') ?? []);

  const buttons = Array.from(document.querySelectorAll('main button')).map(
    (el) => ({
      label: el.textContent.trim(),
      tag: el.tagName,
      href: el.closest('a')?.getAttribute('href') ?? null,
    }),
  );

  const links = Array.from(document.querySelectorAll('main a')).map((el) =>
    el.getAttribute('href'),
  );

  return {
    due: rows.map((row) =>
      Array.from(row.querySelectorAll('td'))
        .map((cell) => cell.textContent.trim())
        .join(' | '),
    ),
    history: history.map((row) =>
      Array.from(row.querySelectorAll('td'))
        .map((cell) => cell.textContent.trim())
        .join(' | '),
    ),
    buttons,
    links,
    payNow: buttons.find((b) => b.label.includes('Pay Now')),
    download: buttons.find((b) => b.label.includes('Download receipt')),
  };
})()`);

check(
  "feesPaidBadge",
  fees.due.every((row) => row.includes("Paid")),
  fees.due.join(" || "),
);

check(
  "feesHistoryNew",
  fees.history[0]?.includes("RCPT-2026-1104"),
  fees.history[0] ?? "-",
);

check(
  "historyLinkToReceipt",
  fees.links.includes("/student/fees/receipt/RCPT-2026-1104"),
  fees.links.filter((l) => l?.startsWith('/student/fees')).join(", "),
);

// The Pay Now action opens the modal that hands over to the method page.
await evaluate(`(() => {
  const button = Array.from(document.querySelectorAll('main button')).find((el) =>
    el.textContent.includes('Pay Now'),
  );
  button.click();
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));

const modal = await evaluate(`(() => {
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return null;
  const link = Array.from(dialog.querySelectorAll('a')).find((el) =>
    el.textContent.includes('Continue to'),
  );
  return { href: link?.getAttribute('href') ?? null };
})()`);

check(
  "payNowHandover",
  modal?.href === "/student/fees/pay?fee=all-fees&method=bkash",
  modal?.href ?? "no modal",
);

// The "Download receipt" action must open the receipt that was just paid.
await evaluate(`(() => {
  const button = Array.from(document.querySelectorAll('main button')).find((el) =>
    el.textContent.includes('Download receipt'),
  );
  button.click();
})()`);
await new Promise((resolve) => setTimeout(resolve, 2000));

const downloadTarget = await evaluate(`(() => ({
  path: location.pathname,
  heading: document.querySelector('[data-receipt="card"] h3')?.textContent.trim(),
}))()`);

check(
  "downloadOpensNewReceipt",
  downloadTarget.path === "/student/fees/receipt/RCPT-2026-1104",
  `the download opened ${downloadTarget.path}`,
);

console.log(
  failures === 0
    ? "\nAll step 9D answer checks passed."
    : `\n${failures} answer check(s) failed.`,
);

ws.close();
process.exit(failures === 0 ? 0 : 1);
