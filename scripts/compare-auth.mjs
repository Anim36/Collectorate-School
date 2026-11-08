/**
 * Compares the rendered auth pages against the Figma frame measurements.
 *
 * Usage: node scripts/compare-auth.mjs <route> <width>
 *   e.g. node scripts/compare-auth.mjs /login 1440
 *
 * The Figma values come from the cached canvas metadata for the step 7 auth
 * frames: "Auth / Login" (2:3194 / 2:3228 / 2:3262), "Auth / Change password"
 * (2:3295 / 2:3330 / 2:3365), "Auth / Login error" (2:3399 / 2:3436 / 2:3473)
 * and "Auth / Login loading" (2:3509 / 2:3544 / 2:3579).
 */

const expected = {
  "/login": {
    1440: {
      authHeader: { top: 0, height: 93, padX: 32 },
      split: { top: 93, height: 901 },
      campus: { top: 93, height: 850, width: 640 },
      form: {
        top: 93,
        padX: 96,
        padY: 96,
        width: 608,
        backLink: 96,
        heading: 139,
        subheading: 209,
        subheadingHeight: 23,
        tabs: 256,
        identifier: 335,
        password: 443,
        remember: 551,
        button: 594,
        guidance: 665,
        privacy: 786,
      },
      totalHeight: 994,
    },
    768: {
      authHeader: { top: 0, height: 93, padX: 32 },
      split: { top: 93, height: 1142 },
      campus: { top: 93, height: 305, width: 768 },
      form: {
        top: 93 + 305,
        padX: 64,
        padY: 64,
        width: 640,
        backLink: 64,
        heading: 107,
        subheading: 177,
        subheadingHeight: 23,
        tabs: 224,
        identifier: 303,
        password: 411,
        remember: 519,
        button: 562,
        guidance: 633,
        privacy: 754,
      },
      totalHeight: 1235,
    },
    375: {
      authHeader: { top: 0, height: 77, padX: 24 },
      split: { top: 77, height: 977 },
      campus: { top: 77, height: 220, width: 375 },
      form: {
        top: 77 + 220,
        padX: 24,
        padY: 24,
        width: 327,
        backLink: 24,
        heading: 67,
        subheading: 137,
        subheadingHeight: 23,
        tabs: 184,
        identifier: 263,
        password: 371,
        remember: 479,
        button: 522,
        guidance: 593,
        privacy: 714,
      },
      totalHeight: 1054,
    },
  },
  "/change-password": {
    1440: {
      authHeader: { top: 0, height: 93, padX: 32 },
      split: { top: 93, height: 968 },
      campus: { top: 93, height: 850, width: 640 },
      form: {
        top: 93,
        padX: 96,
        padY: 96,
        width: 608,
        backLink: 96,
        heading: 139,
        subheading: 209,
        subheadingHeight: 23,
        currentPassword: 256,
        newPassword: 364,
        confirmPassword: 472,
        strength: 580,
        button: 661,
        guidance: 732,
        privacy: 853,
      },
      totalHeight: 1061,
    },
    768: {
      authHeader: { top: 0, height: 93, padX: 32 },
      split: { top: 93, height: 1209 },
      campus: { top: 93, height: 305, width: 768 },
      form: {
        top: 93 + 305,
        padX: 64,
        padY: 64,
        width: 640,
        backLink: 64,
        heading: 107,
        subheading: 177,
        subheadingHeight: 23,
        currentPassword: 224,
        newPassword: 332,
        confirmPassword: 440,
        strength: 548,
        button: 629,
        guidance: 700,
        privacy: 821,
      },
      totalHeight: 1302,
    },
    375: {
      authHeader: { top: 0, height: 77, padX: 24 },
      split: { top: 77, height: 1067 },
      campus: { top: 77, height: 220, width: 375 },
      form: {
        top: 77 + 220,
        padX: 24,
        padY: 24,
        width: 327,
        backLink: 24,
        heading: 67,
        subheading: 137,
        subheadingHeight: 46,
        currentPassword: 207,
        newPassword: 315,
        confirmPassword: 423,
        strength: 531,
        button: 612,
        guidance: 683,
        privacy: 804,
      },
      totalHeight: 1144,
    },
  },
};

// Positional arguments only: a flag such as --dark must not be read as the
// viewport height, or Number() yields NaN and the override silently fails.
const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const route = positional[0] ?? "/login";
const width = Number(positional[1] ?? 1440);
const height = Number(positional[2] ?? 1200);
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
// Dark mode is checked with the same geometry, so the theme is forced before
// the page is measured.
if (dark) {
  await send("Page.navigate", { url: "http://localhost:3111/" });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await send("Runtime.evaluate", {
    expression: `localStorage.setItem('theme', 'dark');`,
  });
}
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

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
  const current = document.querySelector('[data-auth="current-password"]');
  const next = document.querySelector('[data-auth="new-password"]');
  const confirm = document.querySelector('[data-auth="confirm-password"]');
  const remember = document.querySelector('[data-auth="remember"]');
  const button = document.querySelector('[data-auth="button"]');
  const strength = document.querySelector('[data-auth="strength"]');
  const guidance = document.querySelector('[data-auth="guidance"]');
  const privacy = document.querySelector('[data-auth="privacy"]');
  const body = document.body;
  // The Figma artboards are fixed-height frames, so compare the natural
  // content height: the page ends after the last block in the form column
  // plus that column's bottom padding.
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
    current: box(current),
    next: box(next),
    confirm: box(confirm),
    remember: box(remember),
    button: box(button),
    strength: box(strength),
    guidance: box(guidance),
    privacy: box(privacy),
    bodyHeight: Math.round(body.getBoundingClientRect().height),
    naturalHeight: Math.round(formBottom),
    totalHeight: Math.round(document.documentElement.scrollHeight),
  };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

const actual = result.result.value;

function report(label, want, got) {
  if (!got) {
    console.log(`${label.padEnd(18)} MISSING`);
    return;
  }
  const dTop = got.top - want.top;
  const dHeight = got.height - want.height;
  const flag =
    Math.abs(dTop) > 6 || Math.abs(dHeight) > 6 ? "  <-- CHECK" : "";
  console.log(
    `${label.padEnd(18)} top ${String(got.top).padStart(5)} (want ${String(want.top).padStart(5)}, d${dTop})  ` +
      `h ${String(got.height).padStart(5)} (want ${String(want.height).padStart(5)}, d${dHeight})${flag}`,
  );
}

console.log(`=== ${route} @ ${width}px ===`);
report("authHeader", target.authHeader, actual.header);
if (actual.form) {
  const cs = actual.form;
  console.log(
    `form             pad ${cs.padX}/${cs.padY} (want ${target.form.padX}/${target.form.padY})` +
      (Math.abs(cs.padX - target.form.padX) > 1 || Math.abs(cs.padY - target.form.padY) > 1
        ? "  <-- CHECK"
        : ""),
  );
}
report("campus", target.campus, actual.campus);
report("backLink", { top: target.form.top + target.form.backLink, height: 19 }, actual.back);
report("heading", { top: target.form.top + target.form.heading, height: 46 }, actual.heading);
report(
  "subheading",
  {
    top: target.form.top + target.form.subheading,
    height: target.form.subheadingHeight,
  },
  actual.subheading,
);
report("roleTabs", { top: target.form.top + target.form.tabs, height: 55 }, actual.tabs);
report("identifier", { top: target.form.top + target.form.identifier, height: 84 }, actual.identifier);
report("password", { top: target.form.top + target.form.password, height: 84 }, actual.password);
report("currentPassword", { top: target.form.top + target.form.currentPassword, height: 84 }, actual.current);
report("newPassword", { top: target.form.top + target.form.newPassword, height: 84 }, actual.next);
report("confirmPassword", { top: target.form.top + target.form.confirmPassword, height: 84 }, actual.confirm);
report("remember", { top: target.form.top + target.form.remember, height: 19 }, actual.remember);
report("button", { top: target.form.top + target.form.button, height: 47 }, actual.button);
report("strength", { top: target.form.top + target.form.strength, height: 57 }, actual.strength);
report("guidance", { top: target.form.top + target.form.guidance, height: 97 }, actual.guidance);
report("privacy", { top: target.form.top + target.form.privacy, height: 19 }, actual.privacy);

const dTotal = actual.naturalHeight - target.totalHeight;
console.log(
  `page height ${actual.naturalHeight} (want ${target.totalHeight}, d${dTotal})` +
    (Math.abs(dTotal) > 6 ? "  <-- CHECK" : ""),
);

ws.close();
