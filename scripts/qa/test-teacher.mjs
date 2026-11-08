/**
 * Exercises the teacher attendance behaviours through the running browser.
 *
 * Radix drives its select and tab controls from pointer events, so the
 * helpers below fire real pointer sequences instead of synthetic clicks.
 *
 * Usage: node scripts/qa/test-teacher.mjs
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

const results = [];

function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`,
  );
}

async function evaluate(expression) {
  const res = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) {
    return { error: res.exceptionDetails.text ?? "exception" };
  }
  return res.result?.value;
}

/** Fires a pointer sequence on an element, as Radix expects. */
const POINTER_HELPERS = `
  const fire = (el, type, extra = {}) => {
    el.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      ...extra,
    }));
  };

  const pointerClick = (el) => {
    fire(el, 'pointerdown');
    fire(el, 'mousedown');
    fire(el, 'pointerup');
    fire(el, 'mouseup');
    el.click();
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const counters = () => {
    const cards = [...document.querySelectorAll('main p')];
    const find = (label) => {
      const el = cards.find((p) => p.textContent.trim() === label);
      return el ? el.parentElement.querySelector('p:last-child').textContent.trim() : null;
    };
    return {
      present: find('Present'),
      absent: find('Absent'),
      late: find('Late'),
      total: find('Total'),
    };
  };
`;

async function goto(route) {
  await send("Page.navigate", { url: `http://localhost:3111${route}` });
  await new Promise((resolve) => setTimeout(resolve, 2200));
}

await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

// --- 1. The sheet opens with the Figma counters. --------------------------
await goto("/teacher/attendance");

const initial = await evaluate(`(() => {
  ${POINTER_HELPERS}
  return {
    ...counters(),
    title: document.body.innerText.includes('Class 9'),
    shown: document.body.innerText.includes('5 of 32 students shown'),
  };
})()`);

check(
  "counters open at Present 30 / Absent 1 / Late 1 / Total 32",
  initial.present === "30" &&
    initial.absent === "1" &&
    initial.late === "1" &&
    initial.total === "32" &&
    initial.shown === true,
  JSON.stringify(initial),
);

// --- 2. Marking a student updates the counters instantly. -----------------
const afterMark = await evaluate(`(async () => {
  ${POINTER_HELPERS}
  const row = [...document.querySelectorAll('li')].find((li) => li.textContent.includes('Tanvir Ahmed'));
  const absent = [...row.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Absent');
  pointerClick(absent);
  await sleep(300);
  return { ...counters(), pressed: absent.getAttribute('aria-pressed') };
})()`);

check(
  "marking a student absent updates the counters instantly",
  afterMark.present === "29" &&
    afterMark.absent === "2" &&
    afterMark.late === "1" &&
    afterMark.total === "32" &&
    afterMark.pressed === "true",
  JSON.stringify(afterMark),
);

// --- 3. "Mark all present" resets every student. --------------------------
const afterAll = await evaluate(`(async () => {
  ${POINTER_HELPERS}
  const button = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Mark all present');
  pointerClick(button);
  await sleep(300);
  return counters();
})()`);

check(
  "mark all present sets Present 32 / Absent 0 / Late 0",
  afterAll.present === "32" && afterAll.absent === "0" && afterAll.late === "0",
  JSON.stringify(afterAll),
);

// --- 4. Save raises a success toast. -------------------------------------
const afterSave = await evaluate(`(async () => {
  ${POINTER_HELPERS}
  const button = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Save attendance');
  pointerClick(button);
  await sleep(800);
  return {
    toast: document.body.innerText.includes('Attendance saved'),
    lastSaved: document.body.innerText.includes('Last saved'),
  };
})()`);

check(
  "save shows a success toast",
  afterSave.toast === true && afterSave.lastSaved === true,
  JSON.stringify(afterSave),
);

// --- 5. Changing class loads that class's students. ----------------------
const afterClass = await evaluate(`(async () => {
  ${POINTER_HELPERS}
  const trigger = document.querySelector('button[aria-label="Class"]');
  pointerClick(trigger);
  await sleep(500);
  const option = [...document.querySelectorAll('[role="option"]')].find((o) => o.textContent.includes('Class 8'));
  if (!option) return { error: 'no Class 8 option', options: [...document.querySelectorAll('[role="option"]')].map((o) => o.textContent) };
  pointerClick(option);
  await sleep(700);
  return {
    body: document.body.innerText.includes('5 of 12 students shown'),
    hasOld: document.body.innerText.includes('Arif Hasan'),
    title: document.body.innerText.match(/Class 8[^\\n]*/)?.[0] ?? null,
  };
})()`);

check(
  "changing the class loads that class's students",
  afterClass.body === true && afterClass.hasOld === false,
  JSON.stringify(afterClass),
);

// --- 6. The date cannot be a future date. --------------------------------
const dateMax = await evaluate(`(() => {
  const input = document.querySelector('input[type="date"]');
  return { max: input.max, value: input.value };
})()`);

check(
  "the date input caps at today",
  dateMax.max === "2026-11-04",
  JSON.stringify(dateMax),
);

// --- 7. Unsaved changes warn before switching class. ---------------------
const warn = await evaluate(`(async () => {
  ${POINTER_HELPERS}
  const row = [...document.querySelectorAll('li')].find((li) => li.textContent.includes('Joyita Roy'));
  [...row.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Absent').click();
  await sleep(200);

  window.confirm = (message) => {
    window.__confirmMessage = message;
    return false;
  };

  const trigger = document.querySelector('button[aria-label="Class"]');
  pointerClick(trigger);
  await sleep(500);
  const option = [...document.querySelectorAll('[role="option"]')].find((o) => o.textContent.includes('Class 10'));
  if (!option) return { error: 'no Class 10 option' };
  pointerClick(option);
  await sleep(700);
  return {
    message: window.__confirmMessage ?? null,
    stillClass8: document.body.innerText.includes('5 of 12 students shown'),
  };
})()`);

check(
  "unsaved changes warn before switching class and the switch is cancelled",
  typeof warn.message === "string" &&
    warn.message.toLowerCase().includes("unsaved") &&
    warn.stillClass8 === true,
  JSON.stringify(warn),
);

// --- 8. History lists past sheets with their counts. ---------------------
const history = await evaluate(`(async () => {
  ${POINTER_HELPERS}
  const trigger = [...document.querySelectorAll('button[role="tab"]')].find((b) => b.textContent.trim() === 'History');
  pointerClick(trigger);
  await sleep(800);
  const text = document.body.innerText;
  return {
    activeTab: [...document.querySelectorAll('button[role="tab"]')].find((b) => b.getAttribute('data-state') === 'active')?.textContent.trim(),
    hasDate: text.includes('03 Nov 2026'),
    hasSaved: text.includes('Saved'),
    hasPresent31: text.includes('31'),
  };
})()`);

check(
  "history lists past sheets with date and counts",
  history.activeTab === "History" &&
    history.hasDate &&
    history.hasSaved &&
    history.hasPresent31,
  JSON.stringify(history),
);

// --- 9. Opening a past sheet shows it read-only. -------------------------
const readOnly = await evaluate(`(async () => {
  ${POINTER_HELPERS}
  const row = [...document.querySelectorAll('tr')].find((tr) => tr.textContent.includes('03 Nov 2026'));
  if (!row) return { error: 'no history row' };
  pointerClick(row);
  await sleep(900);
  const choices = [...document.querySelectorAll('button[aria-pressed]')];
  const save = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Save attendance');
  return {
    onSheet: document.body.innerText.includes('5 of 32 students shown'),
    choicesDisabled: choices.length > 0 && choices.every((b) => b.disabled),
    count: choices.length,
    saveDisabled: save ? save.disabled : null,
  };
})()`);

check(
  "opening a past sheet shows it read-only",
  readOnly.onSheet === true &&
    readOnly.choicesDisabled === true &&
    readOnly.count > 0 &&
    readOnly.saveDisabled === true,
  JSON.stringify(readOnly),
);

console.log("");
const failed = results.filter((r) => !r.pass);
console.log(
  failed.length === 0
    ? `ALL ${results.length} BEHAVIOURS PASS`
    : `${failed.length} of ${results.length} behaviours failed`,
);

ws.close();
