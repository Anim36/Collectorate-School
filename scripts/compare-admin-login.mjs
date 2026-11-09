/**
 * Measures the administrator sign-in page against the school sign-in page.
 *
 * There is no Figma frame for /admin/login, so the page is measured with the
 * same tool as the other auth pages and the numbers are compared with the
 * /login frame. The difference is reported rather than checked, because the
 * admin page has no tab row and its wording is different by design.
 *
 * Usage: node scripts/compare-admin-login.mjs [width]
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The measurements of the two pages, read from the same expression the
 * compare-auth script uses, so the numbers mean the same thing.
 */
const expression = `(() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      top: Math.round(r.top + window.scrollY),
      left: Math.round(r.left),
      height: Math.round(r.height),
      width: Math.round(r.width),
      padX: parseFloat(cs.paddingLeft),
      padY: parseFloat(cs.paddingTop),
    };
  };
  const header = document.querySelector('header');
  const campus = document.querySelector('[data-auth="campus"]');
  const form = document.querySelector('[data-auth="form"]');
  const back = document.querySelector('[data-auth="back"]');
  const heading = document.querySelector('[data-auth="heading"]');
  const subheading = document.querySelector('[data-auth="subheading"]');
  const tabs = document.querySelector('[data-auth="tabs"]');
  const identifier = document.querySelector('[data-auth="identifier"]');
  const password = document.querySelector('[data-auth="password"]');
  const remember = document.querySelector('[data-auth="remember"]');
  const button = document.querySelector('[data-auth="button"]');
  const guidance = document.querySelector('[data-auth="guidance"]');
  const privacy = document.querySelector('[data-auth="privacy"]');
  const body = document.body;
  const formBox = box(form);
  const privacyBox = box(privacy);
  const formBottom =
    formBox && privacyBox
      ? privacyBox.top + privacyBox.height + formBox.padY
      : 0;
  return {
    header: box(header),
    campus: box(campus),
    form: box(form),
    back: box(back),
    heading: box(heading),
    subheading: box(subheading),
    tabs: box(tabs),
    identifier: box(identifier),
    password: box(password),
    remember: box(remember),
    button: box(button),
    guidance: box(guidance),
    privacy: box(privacy),
    naturalHeight: Math.round(formBottom),
  };
})()`;

/**
 * Reads the expected numbers of the /login frame out of the compare script.
 *
 * The two scripts share one source of truth, so the expected numbers cannot
 * drift apart.
 */
function expectedForLogin(width) {
  const source = readFileSync(
    join(process.cwd(), "scripts", "compare-auth.mjs"),
    "utf8",
  );

  const start = source.indexOf('"/login": {');
  const end = source.indexOf('"/change-password": {');

  const block = source.slice(start, end);

  // The block for one width is the part between its key and the next one.
  const key = new RegExp(`\\n\\s{4}${width}: \\{`);

  const match = key.exec(block);

  if (!match) return null;

  const rest = block.slice(match.index);

  // The block ends where the next width starts.
  const next = /\n\s{4}\d+: \{/.exec(rest.slice(1));

  const body = next ? rest.slice(0, next.index + 1) : rest;

  // The numbers are read as they are written, so the file stays the one
  // place the frame is described.
  const read = (name) => {
    const found = new RegExp(`${name}: (\\d+)`).exec(body);

    return found ? Number(found[1]) : null;
  };

  const formTop = read("top");
  const formPadX = read("padX");
  const formPadY = read("padY");

  return {
    authHeader: { top: 0, height: read("height") },
    campus: { top: read("campus") && formTop, height: null },
    form: { padX: formPadX, padY: formPadY },
    back: read("backLink"),
    heading: read("heading"),
    subheading: read("subheading"),
    tabs: read("tabs"),
    identifier: read("identifier"),
    password: read("password"),
    remember: read("remember"),
    button: read("button"),
    guidance: read("guidance"),
    privacy: read("privacy"),
    totalHeight: read("totalHeight"),
  };
}

const width = Number(process.argv[2] ?? 1440);
const height = Number(process.argv[3] ?? 1200);

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

// The page is opened without a session, so the admin sign-in page is the one
// that is rendered.
await send("Network.clearBrowserCookies");
await send("Page.navigate", { url: "http://localhost:3111/admin/login" });
await new Promise((resolve) => setTimeout(resolve, 2500));

const admin = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

await send("Page.navigate", { url: "http://localhost:3111/login" });
await new Promise((resolve) => setTimeout(resolve, 2500));

const login = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

const adminBox = admin.result.value;
const loginBox = login.result.value;

/**
 * Reports the difference between the two pages for one measurement.
 */
function report(label, a, b) {
  if (!a || !b) {
    console.log(`${label.padEnd(14)} MISSING`);
    return;
  }

  const dTop = a.top - b.top;
  const dHeight = a.height - b.height;

  console.log(
    `${label.padEnd(14)} admin top ${String(a.top).padStart(5)} h ${String(a.height).padStart(4)}   ` +
      `login top ${String(b.top).padStart(5)} h ${String(b.height).padStart(4)}   ` +
      `dTop ${dTop}  dHeight ${dHeight}`,
  );
}

console.log(`=== /admin/login measured against /login @ ${width}px ===`);

report("authHeader", adminBox.header, loginBox.header);
report("campus", adminBox.campus, loginBox.campus);
report("backLink", adminBox.back, loginBox.back);
report("heading", adminBox.heading, loginBox.heading);
report("subheading", adminBox.subheading, loginBox.subheading);
report("roleTabs", adminBox.tabs, loginBox.tabs);
report("identifier", adminBox.identifier, loginBox.identifier);
report("password", adminBox.password, loginBox.password);
report("remember", adminBox.remember, loginBox.remember);
report("button", adminBox.button, loginBox.button);
report("guidance", adminBox.guidance, loginBox.guidance);
report("privacy", adminBox.privacy, loginBox.privacy);

console.log(
  `form padding    admin ${adminBox.form.padX}/${adminBox.form.padY}   ` +
    `login ${loginBox.form.padX}/${loginBox.form.padY}`,
);
console.log(
  `page height     admin ${adminBox.naturalHeight}   login ${loginBox.naturalHeight}   ` +
    `difference ${adminBox.naturalHeight - loginBox.naturalHeight}`,
);

const expected = expectedForLogin(width);

if (expected) {
  console.log("");
  console.log("--- the /login frame, for reference ---");
  console.log(
    `frame height ${expected.totalHeight}, tabs row at ${expected.tabs}, identifier at ${expected.identifier}, ` +
      `button at ${expected.button}, guidance at ${expected.guidance}, privacy at ${expected.privacy}`,
  );
  console.log(
    "the admin page has no tab row, so everything below the subheading sits " +
      "where the tab row would have started:",
  );
  console.log(
    `  identifier ${adminBox.identifier.top - expected.identifier}px against the frame, ` +
      `privacy ${adminBox.privacy.top - expected.privacy}px, ` +
      `page height ${adminBox.naturalHeight - expected.totalHeight}px`,
  );
}

ws.close();
