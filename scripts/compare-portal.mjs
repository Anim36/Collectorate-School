/**
 * Compares a rendered portal shell against the Figma frame measurements.
 *
 * Usage: node scripts/compare-portal.mjs <route> <width>
 *   e.g. node scripts/compare-portal.mjs /student/dashboard 1440
 *
 * The Figma values come from the cached canvas metadata for the step 8
 * portal frames: "Student / Dashboard" (2:3613 / 2:3718 / 2:3805),
 * "Teacher / Dashboard" (2:6341 / 2:6537 / 2:6701) and "Admin / Dashboard"
 * (2:9503 / 2:9700 / 2:9858).
 *
 * The Figma frames are full-page mockups, so the bottom tab bar sits at the
 * bottom of the artwork. The shell pins it to the viewport instead, which is
 * the same relationship: the bar is flush with the bottom edge. The script
 * therefore checks the bar's height and that nothing sits below it, rather
 * than its absolute offset from the top of the artwork.
 */

const expected = {
  "/student/dashboard": {
    1440: {
      frameHeight: 1428,
      sidebar: { top: 0, left: 0, width: 240 },
      sidebarItems: [93, 153, 213, 273, 333, 393, 453, 513, 573],
      sidebarFirstItem: { top: 93, left: 24, width: 192, height: 48 },
      sidebarLastItem: { top: 573, left: 24, width: 192, height: 48 },
      topBar: { top: 0, left: 240, height: 108 },
      content: { top: 108, left: 240 },
      title: { top: 32, left: 32 },
      themeGroup: { top: 32, left: 816 },
      photo: { top: 32, left: 1012, width: 40, height: 40 },
      userName: { top: 32, left: 1068 },
      bottomNav: null,
    },
    768: {
      frameHeight: 1609,
      sidebar: null,
      topBar: { top: 0, left: 0, height: 108 },
      content: { top: 108, left: 0 },
      title: { top: 32, left: 32 },
      themeGroup: { top: 32, left: 384 },
      photo: { top: 32, left: 580, width: 40, height: 40 },
      userName: { top: 32, left: 636 },
      bottomNav: { height: 95, firstTab: { top: 24, left: 24 } },
    },
    375: {
      frameHeight: 1773,
      sidebar: null,
      topBar: { top: 0, left: 0, height: 88 },
      content: { top: 88, left: 0 },
      title: { top: 24, left: 24 },
      themeGroup: { top: 24, left: 231 },
      photo: { top: 24, left: 311, width: 40, height: 40 },
      userName: null,
      bottomNav: { height: 67, firstTab: { top: 12, left: 12 } },
    },
  },
  "/teacher/dashboard": {
    1440: {
      frameHeight: 1741,
      sidebar: { top: 0, left: 0, width: 240 },
      sidebarItems: [93, 153, 213, 273, 333, 393],
      sidebarFirstItem: { top: 93, left: 24, width: 192, height: 48 },
      sidebarLastItem: { top: 393, left: 24, width: 192, height: 48 },
      topBar: { top: 0, left: 240, height: 108 },
      content: { top: 108, left: 240 },
      title: { top: 32, left: 32 },
      themeGroup: { top: 32, left: 816 },
      photo: { top: 32, left: 1012, width: 40, height: 40 },
      userName: { top: 32, left: 1068 },
      bottomNav: null,
    },
    768: {
      frameHeight: 1836,
      sidebar: null,
      topBar: { top: 0, left: 0, height: 108 },
      content: { top: 108, left: 0 },
      title: { top: 32, left: 32 },
      themeGroup: { top: 32, left: 384 },
      photo: { top: 32, left: 580, width: 40, height: 40 },
      userName: { top: 32, left: 636 },
      bottomNav: { height: 95, firstTab: { top: 24, left: 24 } },
    },
    375: {
      frameHeight: 2090,
      sidebar: null,
      topBar: { top: 0, left: 0, height: 88 },
      content: { top: 88, left: 0 },
      title: { top: 24, left: 24 },
      themeGroup: { top: 24, left: 231 },
      photo: { top: 24, left: 311, width: 40, height: 40 },
      userName: null,
      bottomNav: { height: 67, firstTab: { top: 12, left: 12 } },
    },
  },
  "/admin/dashboard": {
    1440: {
      frameHeight: 1646,
      sidebar: { top: 0, left: 0, width: 240 },
      sidebarItems: [93, 153, 213, 289, 349, 409, 469, 529, 589, 649],
      sidebarFirstItem: { top: 93, left: 24, width: 192, height: 48 },
      sidebarLastItem: { top: 649, left: 24, width: 192, height: 20 },
      topBar: { top: 0, left: 240, height: 108 },
      content: { top: 108, left: 240 },
      title: { top: 32, left: 32 },
      themeGroup: { top: 32, left: 816 },
      photo: { top: 32, left: 1012, width: 40, height: 40 },
      userName: { top: 32, left: 1068 },
      bottomNav: null,
    },
    768: {
      frameHeight: 1741,
      sidebar: null,
      topBar: { top: 0, left: 0, height: 108 },
      content: { top: 108, left: 0 },
      title: { top: 32, left: 32 },
      themeGroup: { top: 32, left: 384 },
      photo: { top: 32, left: 580, width: 40, height: 40 },
      userName: { top: 32, left: 636 },
      bottomNav: { height: 95, firstTab: { top: 24, left: 24 } },
    },
    375: {
      frameHeight: 2045,
      sidebar: null,
      topBar: { top: 0, left: 0, height: 88 },
      content: { top: 88, left: 0 },
      title: { top: 24, left: 24 },
      themeGroup: { top: 24, left: 231 },
      photo: { top: 24, left: 311, width: 40, height: 40 },
      userName: null,
      bottomNav: { height: 67, firstTab: { top: 12, left: 12 } },
    },
  },
};

const route = process.argv[2] ?? "/student/dashboard";
const width = Number(process.argv[3] ?? 1440);
// Positional arguments only: a flag such as --dark must not be read as the
// viewport height, or Number() yields NaN and the override silently fails.
const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const height = Number(positional[2] ?? 900);
const dark = process.argv.includes("--dark");

const target = expected[route]?.[width];
if (!target) {
  console.log(`no Figma reference for ${route} @ ${width}`);
  process.exit(1);
}

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
  height,
  deviceScaleFactor: 1,
  mobile: false,
});

if (dark) {
  // The Figma file carries a "/ Dark" variant of every portal frame. The
  // dark frames share the light geometry, so only the theme changes.
  await send("Page.navigate", { url: "http://localhost:3111/" });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await send("Runtime.evaluate", {
    expression: "localStorage.setItem('theme','dark');",
  });
} else {
  await send("Page.navigate", { url: "http://localhost:3111/" });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await send("Runtime.evaluate", {
    expression: "localStorage.setItem('theme','light');",
  });
}

await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(() => {
  const box = (el, origin) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    // A hidden block (display:none) reports a zero rect; treat it as absent.
    if (r.width === 0 && r.height === 0) return null;
    const o = origin?.getBoundingClientRect();
    return {
      top: Math.round((r.top + window.scrollY) - (o ? o.top + window.scrollY : 0)),
      left: Math.round(r.left - (o ? o.left : 0)),
      height: Math.round(r.height),
      width: Math.round(r.width),
    };
  };
  const sidebar = document.querySelector('[data-portal="sidebar"]');
  const topBar = document.querySelector('[data-portal="top-bar"]');
  const content = document.querySelector('[data-portal="content"]');
  const bottomNav = document.querySelector('[data-portal="bottom-nav"]');
  const title = topBar?.querySelector('h1');
  const photo = topBar?.querySelector('img');
  const userLink = photo?.closest('a');
  const userName = userLink?.querySelector('span');
  const buttons = Array.from(topBar?.querySelectorAll('button') ?? []);
  const themeButton = buttons.find((b) => (b.getAttribute('aria-label') ?? '').includes('theme'));
  const themeGroup = themeButton?.parentElement;

  const sidebarItems = Array.from(sidebar?.querySelectorAll('nav a') ?? []);
  // The trailing "More" tab is a button that opens the overflow menu, so the
  // tab bar mixes anchors and buttons.
  const bottomTabs = Array.from(
    bottomNav?.querySelectorAll('a, button') ?? [],
  );

  const bottomNavBox = bottomNav ? box(bottomNav) : null;
  const userLinkBox = box(userLink, topBar);
  const cluster = themeGroup?.parentElement;

  // Active link: the row whose href matches the current route carries
  // aria-current and the action fill.
  const active = sidebarItems.find((a) => a.getAttribute('aria-current') === 'page');
  const activeStyle = active ? getComputedStyle(active) : null;
  const activeLabel = active?.querySelector('span')?.textContent?.trim() ?? null;

  // Keyboard reachability: every nav row is a focusable anchor.
  const focusable = sidebarItems.every((a) => a.tagName === 'A' && a.hasAttribute('href'));

  // Logout points at the login route.
  const logout = sidebarItems.find((a) => a.textContent?.trim() === 'Logout');

  return {
    sidebar: box(sidebar),
    topBar: box(topBar),
    content: box(content),
    bottomNav: bottomNavBox,
    title: box(title, topBar),
    photo: box(photo, topBar),
    userName: box(userName, topBar),
    themeGroup: box(themeGroup, topBar),
    userLink: userLinkBox,
    cluster: box(cluster, topBar),
    themeButton: box(themeButton, topBar),
    sidebarFirstItem: box(sidebarItems[0], sidebar),
    sidebarLastItem: box(sidebarItems[sidebarItems.length - 1], sidebar),
    sidebarItemTops: sidebarItems.map((el) =>
      Math.round(el.getBoundingClientRect().top - sidebar.getBoundingClientRect().top),
    ),
    bottomFirstTab: box(bottomTabs[0], bottomNav),
    bottomLastTab: box(bottomTabs[bottomTabs.length - 1], bottomNav),
    // The tab bar is pinned to the bottom of the viewport, so the gap that
    // matters is the space between the bar and the bottom of the viewport.
    // The page scrolls behind it, so the document can be taller than the bar.
    bottomGap: bottomNavBox
      ? Math.round(
          window.innerHeight -
            (bottomNavBox.top + bottomNavBox.height - window.scrollY),
        )
      : null,
    docWidth: document.documentElement.clientWidth,
    pageHeight: Math.round(document.documentElement.scrollHeight),
    activeLabel,
    activeBackground: activeStyle ? activeStyle.backgroundColor : null,
    allFocusable: focusable,
    logoutHref: logout?.getAttribute('href') ?? null,
    sidebarLinkCount: sidebarItems.length,
    // Bottom tab labels, routes and icon names, for the PRD cross-check.
    bottomTabInfo: bottomTabs.map((el) => ({
      label: el.textContent?.trim() ?? null,
      href: el.getAttribute('href') ?? null,
      icon: el.querySelector('svg')?.getAttribute('class') ?? null,
      tag: el.tagName,
    })),
  };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

const actual = result.result.value;
let failures = 0;

function report(label, want, got, tolerance = 6) {
  if (!want) {
    if (got) {
      console.log(
        `${label.padEnd(18)} UNEXPECTED (top ${got.top}, h ${got.height})  <-- CHECK`,
      );
      failures += 1;
    } else {
      console.log(`${label.padEnd(18)} absent (as in Figma)`);
    }
    return;
  }
  if (!got) {
    console.log(`${label.padEnd(18)} MISSING  <-- CHECK`);
    failures += 1;
    return;
  }

  const dTop = got.top - want.top;
  const dLeft = got.left - (want.left ?? 0);
  const dHeight = want.height === undefined ? 0 : got.height - want.height;
  const dWidth = want.width === undefined ? 0 : got.width - want.width;
  const flag =
    Math.abs(dTop) > tolerance ||
    Math.abs(dLeft) > tolerance ||
    Math.abs(dHeight) > tolerance ||
    Math.abs(dWidth) > tolerance
      ? "  <-- CHECK"
      : "";
  if (flag) failures += 1;

  const parts = [
    `top ${String(got.top).padStart(5)} (want ${String(want.top).padStart(5)}, d${dTop})`,
  ];
  if (want.left !== undefined) {
    parts.push(
      `left ${String(got.left).padStart(5)} (want ${String(want.left).padStart(5)}, d${dLeft})`,
    );
  }
  if (want.height !== undefined) {
    parts.push(
      `h ${String(got.height).padStart(5)} (want ${String(want.height).padStart(5)}, d${dHeight})`,
    );
  }
  if (want.width !== undefined) {
    parts.push(
      `w ${String(got.width).padStart(5)} (want ${String(want.width).padStart(5)}, d${dWidth})`,
    );
  }
  console.log(`${label.padEnd(18)} ${parts.join("  ")}${flag}`);
}

console.log(`=== ${route} @ ${width}px${dark ? " (dark)" : ""} ===`);
report("sidebar", target.sidebar, actual.sidebar);
if (target.sidebarItems) {
  const got = actual.sidebarItemTops ?? [];
  const want = target.sidebarItems;
  const bad = want.filter((top, index) => Math.abs((got[index] ?? NaN) - top) > 6);
  if (bad.length > 0) failures += 1;
  console.log(
    `${"sidebarRows".padEnd(18)} ${got.length}/${want.length} rows at ${JSON.stringify(got)} (want ${JSON.stringify(want)})` +
      (bad.length > 0 ? "  <-- CHECK" : ""),
  );
}
report("sidebarFirstItem", target.sidebarFirstItem, actual.sidebarFirstItem);
report("sidebarLastItem", target.sidebarLastItem, actual.sidebarLastItem);
report("topBar", target.topBar, actual.topBar);
report("content", target.content, actual.content);
report("title", target.title, actual.title);
report("themeGroup", target.themeGroup, actual.themeGroup);
report("photo", target.photo, actual.photo);
report("userName", target.userName, actual.userName);

if (target.bottomNav) {
  // The tab bar is pinned to the bottom of the viewport, so only its height
  // and its inner layout can be compared against the Figma artwork.
  report(
    "bottomNav",
    { top: actual.bottomNav?.top ?? 0, left: 0, height: target.bottomNav.height },
    actual.bottomNav,
  );
  report("bottomFirstTab", target.bottomNav.firstTab, actual.bottomFirstTab);
  const gapOk = actual.bottomGap === 0;
  if (!gapOk) failures += 1;
  console.log(
    `${"bottomFlush".padEnd(18)} gap ${actual.bottomGap}px below the tab bar (want 0)${gapOk ? "" : "  <-- CHECK"}`,
  );
} else {
  report("bottomNav", null, actual.bottomNav);
}

console.log(
  failures === 0
    ? "ALL WITHIN TOLERANCE"
    : `${failures} block(s) out of tolerance`,
);

// Behavioural checks that the geometry cannot capture.
const behaviour = [
  {
    label: "activeLink",
    ok: actual.activeLabel === "Dashboard",
    detail: `active row is "${actual.activeLabel}" (want "Dashboard")`,
  },
  {
    label: "keyboard",
    ok: actual.allFocusable === true,
    detail: `every sidebar row is a focusable link: ${actual.allFocusable}`,
  },
  {
    label: "logout",
    ok: actual.logoutHref === "/login",
    detail: `logout href is "${actual.logoutHref}" (want "/login")`,
  },
];

for (const check of behaviour) {
  if (!check.ok) failures += 1;
  console.log(
    `${check.label.padEnd(18)} ${check.ok ? "PASS" : "FAIL"}  ${check.detail}`,
  );
}

// Bottom tab labels and routes, checked against the PRD feature names.
const expectedTabs = {
  "/student/dashboard": [
    ["Home", "/student/dashboard"],
    ["Attendance", "/student/attendance"],
    ["Result", "/student/result"],
    ["Fees", "/student/fees"],
    ["More", null],
  ],
  "/teacher/dashboard": [
    ["Home", "/teacher/dashboard"],
    ["Attendance", "/teacher/attendance"],
    ["Result", "/teacher/results"],
    ["Notice", "/teacher/notice"],
    ["More", null],
  ],
  "/admin/dashboard": [
    ["Home", "/admin/dashboard"],
    ["Users", "/admin/users"],
    ["Fees", "/admin/fees"],
    ["Notices", "/admin/notices"],
    ["More", null],
  ],
};

const wantTabs = expectedTabs[route];
if (wantTabs) {
  const got = actual.bottomTabInfo ?? [];
  const labelOk = got.every(
    (tab, index) => tab.label === wantTabs[index]?.[0],
  );
  const hrefOk = got.every(
    (tab, index) => tab.href === wantTabs[index]?.[1],
  );
  if (!labelOk || !hrefOk) failures += 1;
  console.log(
    `${"bottomTabs".padEnd(18)} ${labelOk && hrefOk ? "PASS" : "FAIL"}  ` +
      got.map((tab) => `${tab.label}->${tab.href ?? "menu"}`).join(", "),
  );
}

console.log(
  failures === 0
    ? "ALL CHECKS PASSED"
    : `${failures} check(s) failed`,
);

ws.close();
