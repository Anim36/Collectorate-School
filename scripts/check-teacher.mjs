/**
 * Drives a teacher portal route in the debug browser and reports what it
 * finds, so the behaviour of the step 10B pages can be checked in the real
 * page rather than in the source.
 *
 * Usage: node scripts/check-teacher.mjs <route> [width]
 */
const route = process.argv[2] ?? "/teacher/results";
const width = Number(process.argv[3] ?? 1440);

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
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

/**
 * Runs an expression in the page and returns its value.
 */
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });

  if (result.exceptionDetails) {
    return { error: result.exceptionDetails.text };
  }

  return result.result.value;
}

/**
 * Types a value into an input the way a reader would, so React sees the
 * change.
 */
async function typeInto(selector, value) {
  return evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    if (!input) return "NO INPUT";

    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    ).set;
    setter.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return "OK";
  })()`);
}

/**
 * Clicks an element found by its visible text.
 */
async function clickByText(tag, text) {
  return evaluate(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(tag)})]
      .find((n) => n.textContent.trim() === ${JSON.stringify(text)});
    if (!el) return "NOT FOUND";
    el.click();
    return "OK";
  })()`);
}

const scenario = process.argv[4] ?? "summary";

if (scenario === "summary") {
  const summary = await evaluate(`(() => {
    const root = document.querySelector('[data-portal="content"]')?.firstElementChild;
    const blocks = [...root.children].map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 60),
    }));
    const buttons = [...document.querySelectorAll('button')].map((b) => ({
      text: b.textContent.trim(),
      disabled: b.disabled,
    }));
    const badges = [...document.querySelectorAll('span')].map((b) => b.textContent.trim())
      .filter((t) => t === 'Draft' || t === 'Published' || t === 'Awaiting admin approval');
    return { blocks, buttons, badges };
  })()`);

  console.log(JSON.stringify(summary, null, 2));
}

if (scenario === "invalid") {
  // Type a mark above 100 and read the state of the page.
  const typed = await typeInto('input[aria-label="Marks of Tanvir Ahmed"]', "107");
  console.log("typed:", typed);
  await new Promise((resolve) => setTimeout(resolve, 600));

  const state = await evaluate(`(() => {
    const root = document.querySelector('[data-portal="content"]')?.firstElementChild;
    const publish = [...document.querySelectorAll('button')]
      .find((b) => b.textContent.trim() === 'Publish results');
    const save = [...document.querySelectorAll('button')]
      .find((b) => b.textContent.trim() === 'Save Draft');
    const errorPanel = [...root.children].find((el) =>
      (el.textContent || '').includes('needs your attention'));
    const invalid = document.querySelector('td .text-danger');
    const note = root.lastElementChild;
    return {
      publishDisabled: publish?.disabled ?? 'NO BUTTON',
      saveDisabled: save?.disabled ?? 'NO BUTTON',
      errorPanelText: errorPanel ? errorPanel.textContent.trim().replace(/\\s+/g, ' ') : 'MISSING',
      errorPanelHeight: errorPanel ? Math.round(errorPanel.getBoundingClientRect().height) : null,
      errorPanelTop: errorPanel ? Math.round(errorPanel.getBoundingClientRect().top - root.getBoundingClientRect().top) : null,
      invalidGrade: invalid ? invalid.textContent.trim() : 'MISSING',
      note: note.textContent.trim().replace(/\\s+/g, ' '),
    };
  })()`);

  console.log(JSON.stringify(state, null, 2));
}

if (scenario === "publish") {
  await clickByText("button", "Publish results");
  await new Promise((resolve) => setTimeout(resolve, 800));

  const state = await evaluate(`(() => {
    const root = document.querySelector('[data-portal="content"]')?.firstElementChild;
    const inputs = [...document.querySelectorAll('input[aria-label^="Marks of"]')];
    const edit = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Edit');
    const publish = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Publish results');
    const toast = document.querySelector('[data-sonner-toast], [role="status"], [data-radix-toast-announce-exclude]');
    return {
      inputsDisabled: inputs.every((i) => i.disabled),
      inputCount: inputs.length,
      editShown: Boolean(edit),
      publishShown: Boolean(publish),
      badge: [...document.querySelectorAll('span')].map((s) => s.textContent.trim()).find((t) => t === 'Published' || t === 'Draft'),
      note: root.lastElementChild.textContent.trim().replace(/\\s+/g, ' '),
      toast: toast ? toast.textContent.trim().replace(/\\s+/g, ' ') : 'NO TOAST',
    };
  })()`);

  console.log(JSON.stringify(state, null, 2));
}

if (scenario === "toast") {
  await clickByText("button", "Save Draft");
  await new Promise((resolve) => setTimeout(resolve, 800));

  const toast = await evaluate(`(() => {
    const el = document.querySelector('[data-radix-toast-announce-exclude], [data-sonner-toast], li[data-radix-toast-announce-exclude]');
    const all = [...document.querySelectorAll('body *')].filter((n) =>
      /saved|published/i.test(n.textContent || '') && n.children.length === 0);
    return {
      region: el ? el.textContent.trim().replace(/\\s+/g, ' ') : 'NO REGION',
      leaves: all.slice(0, 5).map((n) => n.textContent.trim()),
    };
  })()`);

  console.log(JSON.stringify(toast, null, 2));
}

if (scenario === "filter") {
  // Open the class filter and pick a different class.
  const before = await evaluate(`(() => {
    const inputs = [...document.querySelectorAll('input[aria-label^="Marks of"]')];
    return inputs.map((i) => i.getAttribute('aria-label'));
  })()`);

  await evaluate(`(() => {
    const trigger = document.querySelector('button[aria-label="Class"]');
    if (!trigger) return "NO TRIGGER";
    trigger.click();
    return "OK";
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 700));

  const options = await evaluate(`(() =>
    [...document.querySelectorAll('[role="option"]')].map((o) => o.textContent.trim())
  )()`);
  console.log("options:", JSON.stringify(options));

  const picked = await evaluate(`(() => {
    const option = [...document.querySelectorAll('[role="option"]')]
      .find((o) => o.textContent.trim().startsWith('Class 9'));
    if (!option) return "NOT FOUND";
    option.click();
    return option.textContent.trim();
  })()`);
  console.log("picked:", picked);
  await new Promise((resolve) => setTimeout(resolve, 700));

  const after = await evaluate(`(() => {
    const inputs = [...document.querySelectorAll('input[aria-label^="Marks of"]')];
    const trigger = document.querySelector('button[aria-label="Class"]');
    return {
      labels: inputs.map((i) => i.getAttribute('aria-label')),
      trigger: trigger ? trigger.textContent.trim() : 'NO TRIGGER',
    };
  })()`);
  console.log("before:", JSON.stringify(before));
  console.log("after:", JSON.stringify(after));
}

if (scenario === "notice-filter") {
  await evaluate(`(() => {
    const trigger = document.querySelector('button[aria-label="Audience"]');
    if (!trigger) return "NO TRIGGER";
    trigger.click();
    return "OK";
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 700));

  const options = await evaluate(`(() =>
    [...document.querySelectorAll('[role="option"]')].map((o) => o.textContent.trim())
  )()`);
  console.log("options:", JSON.stringify(options));

  const picked = await evaluate(`(() => {
    const option = [...document.querySelectorAll('[role="option"]')]
      .find((o) => o.textContent.trim() === 'For students');
    if (!option) return "NOT FOUND";
    option.click();
    return option.textContent.trim();
  })()`);
  console.log("picked:", picked);
  await new Promise((resolve) => setTimeout(resolve, 700));

  const rows = await evaluate(`(() =>
    [...document.querySelectorAll('table tbody tr')].map((tr) =>
      [...tr.children].map((td) => td.textContent.trim()).join(' | '))
  )()`);
  console.log("rows:", JSON.stringify(rows, null, 2));
}

if (scenario === "upload") {
  const before = await evaluate(`(() => ({
    rows: document.querySelectorAll('table tbody tr').length,
    uploadButton: [...document.querySelectorAll('button')]
      .find((b) => b.textContent.includes('Upload'))?.textContent.trim(),
  }))()`);
  console.log("before:", JSON.stringify(before));

  // Simulate a drop of two files.
  const dropped = await evaluate(`(() => {
    const zone = [...document.querySelectorAll('section')]
      .find((s) => s.textContent.includes('Drag and drop your photos here'));
    if (!zone) return "NO ZONE";

    const transfer = new DataTransfer();
    for (const name of ['science-fair-03.jpg', 'science-fair-04.jpg']) {
      transfer.items.add(new File(['x'], name, { type: 'image/jpeg' }));
    }
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
    return "DROPPED";
  })()`);
  console.log("dropped:", dropped);
  await new Promise((resolve) => setTimeout(resolve, 700));

  const after = await evaluate(`(() => ({
    rows: document.querySelectorAll('table tbody tr').length,
    uploadButton: [...document.querySelectorAll('button')]
      .find((b) => b.textContent.includes('Upload'))?.textContent.trim(),
    statuses: [...document.querySelectorAll('table tbody tr')]
      .map((tr) => tr.textContent.trim().replace(/\\s+/g, ' ')),
    badges: [...document.querySelectorAll('span')]
      .map((s) => s.textContent.trim())
      .filter((t) => t.includes('Awaiting')),
  }))()`);
  console.log("after:", JSON.stringify(after, null, 2));
}

ws.close();
