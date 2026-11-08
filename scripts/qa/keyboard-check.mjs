/**
 * Step 12 keyboard and focus check.
 *
 * Drives the interactive parts of the app with the keyboard only and reports
 * what does not work:
 *   - the navbar dropdown opens and closes with the keyboard
 *   - the mobile drawer opens, traps the focus and closes with Esc
 *   - a modal traps the focus, closes with Esc and gives the focus back
 *   - the tabs move with the arrow keys
 *   - the lightbox closes with Esc
 *
 * Usage: node scripts/qa/keyboard-check.mjs
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

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    return {
      __error:
        result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text,
    };
  }
  return result.result.value;
}

async function visit(url, width) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: `http://localhost:3111${url}` });
  await new Promise((resolve) => setTimeout(resolve, 1800));
}

/**
 * Presses a key on the page.
 *
 * A native button activates on the default action of the key press, so the
 * event carries the character as well as the key code.
 */
async function press(key, code, keyCode, text) {
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
    ...(text ? { text, unmodifiedText: text } : {}),
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  await new Promise((resolve) => setTimeout(resolve, 350));
}

/** Presses Enter, which activates a native button. */
async function pressEnter() {
  await press("Enter", "Enter", 13, "\r");
}

const results = [];

function check(label, ok, detail) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label.padEnd(30)} ${detail}`);
}

/* ------------------------------------------------- the navbar dropdown -- */

await visit("/", 1440);

// The "Admission" dropdown trigger.
const dropdown = await evaluate(`(() => {
  const trigger = [...document.querySelectorAll('header button, header a[role="button"]')]
    .find((b) => b.textContent.trim().startsWith('Admission'));
  if (!trigger) return null;
  trigger.focus();
  return { focused: document.activeElement === trigger, label: trigger.textContent.trim() };
})()`);

if (!dropdown) {
  check("navbar dropdown trigger", false, "the trigger was not found");
} else {
  check("navbar dropdown trigger", dropdown.focused, `"${dropdown.label}" took the focus`);

  await pressEnter();
  const opened = await evaluate(`(() => {
    const menu = document.querySelector('[role="menu"]');
    return {
      open: Boolean(menu),
      items: menu ? menu.querySelectorAll('[role="menuitem"], a').length : 0,
      focusInside: Boolean(menu && menu.contains(document.activeElement)),
    };
  })()`);

  check(
    "navbar dropdown opens",
    opened.open,
    `menu ${opened.open ? "opened" : "did not open"}, ${opened.items} items`,
  );
  check(
    "navbar dropdown focus",
    opened.focusInside,
    `the focus moved into the menu: ${opened.focusInside}`,
  );

  await press("Escape", "Escape", 27);
  const closed = await evaluate(`(() => {
    const menu = document.querySelector('[role="menu"]');
    return {
      closed: !menu,
      focusBack: document.activeElement?.textContent?.trim().startsWith('Admission') ?? false,
    };
  })()`);

  check(
    "navbar dropdown Esc",
    closed.closed,
    `the menu closed: ${closed.closed}`,
  );
  check(
    "navbar dropdown focus back",
    closed.focusBack,
    `the focus returned to the trigger: ${closed.focusBack}`,
  );
}

/* ------------------------------------------------------ the mobile menu -- */

await visit("/", 375);

const drawer = await evaluate(`(() => {
  const trigger = document.querySelector('header button[aria-controls]');
  if (!trigger) return null;
  trigger.focus();
  return { focused: document.activeElement === trigger };
})()`);

if (!drawer) {
  check("mobile drawer trigger", false, "the trigger was not found");
} else {
  check("mobile drawer trigger", drawer.focused, "the hamburger took the focus");

  await pressEnter();
  // The drawer opens on the next render, so the state is read once it has
  // settled.
  await new Promise((resolve) => setTimeout(resolve, 600));
  const opened = await evaluate(`(() => {
    const panel = document.getElementById('mobile-navigation');
    return {
      open: Boolean(panel) && !panel.hasAttribute('hidden'),
      focusInside: Boolean(panel && panel.contains(document.activeElement)),
    };
  })()`);

  check("mobile drawer opens", opened.open, `the drawer opened: ${opened.open}`);
  check(
    "mobile drawer focus",
    opened.focusInside,
    `the focus moved into the drawer: ${opened.focusInside}`,
  );

  await press("Escape", "Escape", 27);
  const closed = await evaluate(`(() => {
    const panel = document.getElementById('mobile-navigation');
    return {
      closed: !panel || panel.hasAttribute('hidden'),
      focusBack:
        document.activeElement?.getAttribute('aria-controls') === 'mobile-navigation',
    };
  })()`);

  check("mobile drawer Esc", closed.closed, `the drawer closed: ${closed.closed}`);
  check(
    "mobile drawer focus back",
    closed.focusBack,
    `the focus returned to the trigger: ${closed.focusBack}`,
  );
}

/* ------------------------------------------------------------ a modal -- */

await visit("/student/fees", 1440);

const modal = await evaluate(`(() => {
  const button = [...document.querySelectorAll('main button')]
    .find((b) => b.textContent.trim().includes('Pay Now'));
  if (!button) return null;
  button.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));

if (!modal) {
  check("modal opens", false, "the Pay Now button was not found");
} else {
  const state = await evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return { open: false };
    const focusables = dialog.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    return {
      open: true,
      focusInside: dialog.contains(document.activeElement),
      focusableCount: focusables.length,
      activeLabel: document.activeElement?.textContent?.trim().slice(0, 30),
    };
  })()`);

  check("modal opens", state.open, `the dialog opened: ${state.open}`);
  check(
    "modal focus",
    state.focusInside,
    `the focus moved into the dialog: ${state.focusInside} (${state.activeLabel})`,
  );

  // The focus must stay inside the dialog while it is open.
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
  });
  await new Promise((resolve) => setTimeout(resolve, 300));

  const trapped = await evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return {
      inside: Boolean(dialog && dialog.contains(document.activeElement)),
      active: document.activeElement?.textContent?.trim().slice(0, 30),
    };
  })()`);

  check(
    "modal focus trap",
    trapped.inside,
    `the focus stayed inside the dialog: ${trapped.inside} (${trapped.active})`,
  );

  await press("Escape", "Escape", 27);
  const closed = await evaluate(`(() => ({
    closed: !document.querySelector('[role="dialog"]'),
    focusBack:
      document.activeElement?.textContent?.trim().includes('Pay Now') ?? false,
  }))()`);

  check("modal Esc", closed.closed, `the dialog closed: ${closed.closed}`);
  check(
    "modal focus back",
    closed.focusBack,
    `the focus returned to the trigger: ${closed.focusBack}`,
  );
}

/* ------------------------------------------------------------- the tabs -- */

await visit("/teacher/attendance", 1440);

const tabs = await evaluate(`(() => {
  const list = [...document.querySelectorAll('button[role="tab"]')];
  if (list.length === 0) return null;
  list[0].focus();
  return {
    count: list.length,
    focused: document.activeElement === list[0],
    labels: list.map((t) => t.textContent.trim()),
  };
})()`);

if (!tabs) {
  check("tabs present", false, "no tab list was found");
} else {
  check("tabs present", tabs.count > 0, `${tabs.count} tabs: ${tabs.labels.join(", ")}`);
  check("tabs focusable", tabs.focused, "the first tab took the focus");

  await press("ArrowRight", "ArrowRight", 39);
  const moved = await evaluate(`(() => {
    const active = document.querySelector('button[role="tab"][aria-selected="true"]');
    return {
      selected: active?.textContent?.trim() ?? null,
      focused: document.activeElement?.getAttribute('role') === 'tab',
    };
  })()`);

  check(
    "tabs arrow key",
    moved.focused,
    `the focus moved to the "${moved.selected}" tab: ${moved.focused}`,
  );
}

/* -------------------------------------------------------- the lightbox -- */

await visit("/gallery/science-fair-2026", 1440);

const lightbox = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')]
    .find((b) => b.getAttribute('aria-label')?.toLowerCase().includes('photo'));
  if (!button) return null;
  button.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));

if (!lightbox) {
  check("lightbox present", false, "no photo button was found");
} else {
  const state = await evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return {
      open: Boolean(dialog),
      focusInside: Boolean(dialog && dialog.contains(document.activeElement)),
    };
  })()`);

  check("lightbox opens", state.open, `the lightbox opened: ${state.open}`);
  check(
    "lightbox focus",
    state.focusInside,
    `the focus moved into the lightbox: ${state.focusInside}`,
  );

  await press("Escape", "Escape", 27);
  const closed = await evaluate(`(() => ({
    closed: !document.querySelector('[role="dialog"]'),
  }))()`);

  check("lightbox Esc", closed.closed, `the lightbox closed: ${closed.closed}`);
}

const failed = results.filter((result) => !result.ok);
console.log(
  failed.length === 0
    ? "\nAll keyboard checks passed."
    : `\n${failed.length} keyboard check(s) failed.`,
);

ws.close();
process.exit(failed.length === 0 ? 0 : 1);
