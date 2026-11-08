/**
 * Checks that each student portal route marks the matching sidebar row and
 * bottom tab as the current page.
 *
 * Usage: node scripts/check-student-nav.mjs
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
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

const expected = [
  { route: "/student/dashboard", sidebar: "Dashboard", tab: "Home" },
  { route: "/student/profile", sidebar: "My Profile", tab: null },
  { route: "/student/attendance", sidebar: "Attendance", tab: "Attendance" },
  { route: "/student/performance", sidebar: "Performance", tab: null },
  { route: "/student/result", sidebar: "Result", tab: "Result" },
  { route: "/student/fees", sidebar: "Fee Payment", tab: "Fees" },
];

let failures = 0;

for (const entry of expected) {
  await send("Page.navigate", { url: `http://localhost:3111${entry.route}` });
  await new Promise((resolve) => setTimeout(resolve, 2200));

  const result = await send("Runtime.evaluate", {
    expression: `(() => {
      const sidebar = document.querySelector('[data-portal="sidebar"]');
      const nav = document.querySelector('[data-portal="bottom-nav"]');
      const activeSidebar = Array.from(sidebar?.querySelectorAll('a') ?? []).find(
        (a) => a.getAttribute('aria-current') === 'page',
      );
      const activeTab = Array.from(nav?.querySelectorAll('a') ?? []).find(
        (a) => a.getAttribute('aria-current') === 'page',
      );
      const heading = document.querySelector('main h2');
      return {
        sidebar: activeSidebar?.textContent?.trim() ?? null,
        tab: activeTab?.textContent?.trim() ?? null,
        heading: heading?.textContent?.trim() ?? null,
      };
    })()`,
    returnByValue: true,
  });

  const got = result.result.value;

  const sidebarOk = got.sidebar === entry.sidebar;
  const tabOk =
    entry.tab === null ? got.tab === null : got.tab === entry.tab;
  const headingOk = Boolean(got.heading);

  if (!sidebarOk || !tabOk || !headingOk) failures += 1;

  console.log(
    `${sidebarOk && tabOk && headingOk ? "PASS" : "FAIL"}  ${entry.route.padEnd(22)}` +
      ` sidebar="${got.sidebar}" tab="${got.tab ?? "-"}" heading="${got.heading}"`,
  );
}

console.log(
  failures === 0
    ? "\nEvery student route marks the right navigation rows."
    : `\n${failures} navigation check(s) failed.`,
);

ws.close();
process.exit(failures === 0 ? 0 : 1);
