/**
 * Exercises the attendance page's month selector, reopening the dropdown
 * before each switch, and reports the summary counts after every month.
 *
 * Usage: node scripts/check-month-switch.mjs [route] [width]
 */
const route = process.argv[2] ?? "/student/attendance";
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
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const read = () => {
    const trigger = document.querySelector('#attendance-month');
    const metrics = Array.from(
      document.querySelectorAll('main > div > div:nth-child(3) > div > div'),
    ).map((card) => {
      const parts = card.querySelectorAll('p');
      return parts.length >= 3
        ? parts[0].textContent.trim() + '=' + parts[1].textContent.trim() +
          ' (' + parts[2].textContent.trim() + ')'
        : card.textContent.trim();
    });
    const letters = Array.from(
      document.querySelectorAll('main > div > div:nth-child(4) span'),
    )
      .map((span) => span.textContent.trim())
      .filter((text) => ['P', 'A', 'L', '—'].includes(text));
    return {
      month: trigger ? trigger.textContent.trim() : null,
      metrics,
      markedDays: letters.length,
      letters: letters.join(''),
    };
  };

  const results = [{ step: 'initial', ...read() }];

  for (const label of ['September 2026', 'November 2026', 'October 2026']) {
    document.querySelector('#attendance-month').click();
    await wait(500);

    const option = Array.from(
      document.querySelectorAll('[role="option"]'),
    ).find((candidate) => candidate.textContent.trim() === label);
    if (!option) {
      results.push({ step: label, error: 'option not found' });
      continue;
    }

    option.click();
    await wait(700);
    results.push({ step: label, ...read() });
  }

  return results;
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  awaitPromise: true,
  returnByValue: true,
});

for (const row of result.result.value ?? []) {
  console.log(`--- ${row.step}${row.error ? ' ERROR: ' + row.error : ''}`);
  if (row.error) continue;
  console.log(`    month:      ${row.month}`);
  for (const metric of row.metrics) console.log(`    metric:     ${metric}`);
  console.log(`    markedDays: ${row.markedDays}`);
  console.log(`    letters:    ${row.letters}`);
}

ws.close();
