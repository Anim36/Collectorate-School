/**
 * Checks that each bottom tab's icon matches its label and that the "More"
 * menu opens with the expected PRD entries.
 *
 * Usage: node scripts/check-portal-tabs.mjs
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

/** Expected tab icon per role, matched by the lucide class on the glyph. */
const expected = {
  "/student/dashboard": {
    tabs: [
      { label: "Home", icon: "gauge" },
      { label: "Attendance", icon: "clipboard-check" },
      { label: "Result", icon: "scroll-text" },
      { label: "Fees", icon: "wallet" },
      { label: "More", icon: "ellipsis" },
    ],
    more: [
      { label: "My Profile", icon: "user-round" },
      { label: "Performance", icon: "book-open" },
      { label: "Notice", icon: "megaphone" },
      { label: "Gallery", icon: "images" },
      { label: "Logout", icon: "log-out" },
    ],
  },
  "/teacher/dashboard": {
    tabs: [
      { label: "Home", icon: "gauge" },
      { label: "Attendance", icon: "clipboard-check" },
      { label: "Result", icon: "scroll-text" },
      { label: "Notice", icon: "megaphone" },
      { label: "More", icon: "ellipsis" },
    ],
    more: [
      { label: "Gallery", icon: "images" },
      { label: "Logout", icon: "log-out" },
    ],
  },
  "/admin/dashboard": {
    tabs: [
      { label: "Home", icon: "gauge" },
      { label: "Users", icon: "users" },
      { label: "Fees", icon: "wallet" },
      { label: "Notices", icon: "megaphone" },
      { label: "More", icon: "ellipsis" },
    ],
    more: [
      { label: "Classes and Subjects", icon: "folder-tree" },
      { label: "Gallery", icon: "images" },
      { label: "Routine", icon: "clock" },
      { label: "Calendar", icon: "calendar-days" },
      { label: "Audit Log", icon: "file-clock" },
      { label: "Logout", icon: "log-out" },
    ],
  },
};

const readTabs = `(() => {
  const nav = document.querySelector('[data-portal="bottom-nav"]');
  const read = (el) => {
    const svg = el.querySelector('svg');
    const cls = svg?.getAttribute('class') ?? '';
    // lucide-react puts the icon name in the class list.
    const name = cls.split(' ').find((c) => c && !c.startsWith('size-') && c !== 'lucide' && c !== 'lucide-circle') ?? '';
    return {
      label: el.textContent?.trim() ?? '',
      href: el.getAttribute('href') ?? null,
      icon: name.replace(/^lucide-/, ''),
    };
  };
  return {
    tabs: Array.from(nav?.querySelectorAll('a, button') ?? []).map(read),
    more: null,
  };
})()`;

const readMore = `(() => {
  const panel = document.querySelector('#portal-more-menu');
  if (!panel) return null;
  return Array.from(panel.querySelectorAll('a')).map((el) => {
    const svg = el.querySelector('svg');
    const cls = svg?.getAttribute('class') ?? '';
    const name = cls.split(' ').find((c) => c && !c.startsWith('size-') && c !== 'lucide') ?? '';
    return {
      label: el.textContent?.trim() ?? '',
      href: el.getAttribute('href') ?? null,
      icon: name.replace(/^lucide-/, ''),
    };
  });
})()`;

let failures = 0;

for (const [route, want] of Object.entries(expected)) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: 375,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: `http://localhost:3111${route}` });
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const tabsResult = await send("Runtime.evaluate", {
    expression: readTabs,
    returnByValue: true,
  });
  const tabs = tabsResult.result.value.tabs;

  const tabOk = tabs.every(
    (tab, index) =>
      tab.label === want.tabs[index].label &&
      tab.icon === want.tabs[index].icon,
  );
  if (!tabOk) failures += 1;
  console.log(
    `${tabOk ? "PASS" : "FAIL"}  ${route} tabs   ` +
      tabs.map((t) => `${t.label}[${t.icon}]`).join(" "),
  );

  // Open the More menu and read its entries.
  await send("Runtime.evaluate", {
    expression: `document.querySelector('[data-portal="bottom-nav"] button').click()`,
  });
  await new Promise((resolve) => setTimeout(resolve, 400));

  const moreResult = await send("Runtime.evaluate", {
    expression: readMore,
    returnByValue: true,
  });
  const more = moreResult.result.value;

  const moreOk =
    Array.isArray(more) &&
    more.length === want.more.length &&
    more.every(
      (item, index) =>
        item.label === want.more[index].label &&
        item.icon === want.more[index].icon,
    );
  if (!moreOk) failures += 1;
  console.log(
    `${moreOk ? "PASS" : "FAIL"}  ${route} more   ` +
      (Array.isArray(more)
        ? more.map((m) => `${m.label}[${m.icon}]`).join(" ")
        : "menu did not open"),
  );

  await send("Runtime.evaluate", {
    expression: `document.querySelector('[data-portal="bottom-nav"] button').click()`,
  });
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Keyboard: Escape closes the menu and returns focus to the trigger.
  const escapeResult = await send("Runtime.evaluate", {
    expression: `(() => {
      const trigger = document.querySelector('[data-portal="bottom-nav"] button');
      trigger.focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      const panel = document.querySelector('#portal-more-menu');
      return {
        closed: panel === null,
        focusReturned: document.activeElement === trigger,
      };
    })()`,
    returnByValue: true,
  });
  const escape = escapeResult.result.value;
  const escapeOk = escape.closed === true && escape.focusReturned === true;
  if (!escapeOk) failures += 1;
  console.log(
    `${escapeOk ? "PASS" : "FAIL"}  ${route} escape  ` +
      `closed=${escape.closed} focusReturned=${escape.focusReturned}`,
  );
}

console.log(
  failures === 0
    ? "\nAll bottom tab icons and More menus match the PRD."
    : `\n${failures} tab check(s) failed.`,
);

ws.close();
process.exit(failures === 0 ? 0 : 1);
