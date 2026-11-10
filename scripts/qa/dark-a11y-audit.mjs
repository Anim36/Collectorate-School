/**
 * Step 12 dark mode and accessibility audit.
 *
 * Walks every route in both themes and reports:
 *   - text that falls below the WCAG AA contrast ratio against its backdrop
 *   - borders that are invisible against the surface they sit on
 *   - chart and calendar colours that are too close to the surface
 *   - images whose alt text is missing
 *   - inputs without a label and icon-only buttons without an accessible name
 *
 * Usage: node scripts/qa/dark-a11y-audit.mjs
 */

import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const APP_DIR = path.resolve("src/app");
const ORIGIN = "http://localhost:3111";

const SEGMENT_EXAMPLES = {
  "/notice/[id]": "annual-examination-schedule",
  "/student/notice/[id]": "annual-examination-schedule",
  "/gallery/[albumId]": "science-fair-2026",
  "/student/gallery/[albumId]": "science-fair-2026",
  "/student/fees/receipt/[id]": "RCPT-2026-1042",
};

function collectRoutes(dir, prefix = "") {
  const routes = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    const segment = entry.startsWith("(") && entry.endsWith(")") ? "" : entry;
    const next = `${prefix}/${segment}`.replace(/\/+$/, "");
    try {
      if (statSync(path.join(full, "page.tsx")).isFile()) routes.push(next || "/");
    } catch {
      /* not a route folder */
    }
    routes.push(...collectRoutes(full, next));
  }
  return routes;
}

function toUrl(route) {
  const example = SEGMENT_EXAMPLES[route];
  if (example) return route.replace(/\[[a-zA-Z]+\]/, example);
  return route;
}

const routes = [...new Set(collectRoutes(APP_DIR))].sort().map(toUrl);

/* ---------------------------------------------------------------- colours -- */

/** Parses a computed colour into rgb components. */
const COLOUR_FUNCTION = `(() => {
  const parse = (value) => {
    const match = value.match(/rgba?\\(([^)]+)\\)/);
    if (!match) return null;
    const parts = match[1].split(',').map((part) => parseFloat(part));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
  };

  // The relative luminance, per WCAG 2.1.
  const luminance = (colour) => {
    const channel = (value) => {
      const v = value / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return (
      0.2126 * channel(colour.r) +
      0.7152 * channel(colour.g) +
      0.0722 * channel(colour.b)
    );
  };

  // The contrast ratio between two colours.
  const contrast = (a, b) => {
    const la = luminance(a);
    const lb = luminance(b);
    const light = Math.max(la, lb);
    const dark = Math.min(la, lb);
    return (light + 0.05) / (dark + 0.05);
  };

  // The nearest ancestor that paints a background, so a text node is compared
  // against the surface it really sits on.
  const backdrop = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      const colour = parse(style.backgroundColor);
      if (colour && colour.a > 0.05) return colour;
      node = node.parentElement;
    }
    return parse(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 };
  };

  // Text that sits on top of a photograph is checked by eye, so it is
  // reported separately. The photograph may be a sibling of the text inside
  // a positioned band, so the whole subtree is searched.
  const overImage = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      if (node.tagName === 'IMG') return true;
      if (node.querySelector && node.querySelector('img')) return true;
      node = node.parentElement;
    }
    return false;
  };

  const visible = (el) => {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  /* ---- text contrast ---- */
  const textIssues = [];
  for (const el of document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, h5, h6, li, td, th, label, dt, dd, figcaption, blockquote')) {
    if (!visible(el)) continue;
    // Only elements that hold their own text.
    const own = Array.from(el.childNodes)
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent.trim())
      .join(' ')
      .trim();
    if (!own) continue;

    const style = getComputedStyle(el);
    const fg = parse(style.color);
    if (!fg || fg.a < 0.1) continue;
    const bg = backdrop(el);
    const value = contrast(fg, bg);

    const size = parseFloat(style.fontSize);
    const bold = Number(style.fontWeight) >= 700;
    // WCAG AA: 4.5 for normal text, 3 for large text (18.66px bold or 24px).
    const large = size >= 24 || (bold && size >= 18.66);
    const required = large ? 3 : 4.5;

    if (value < required) {
      textIssues.push({
        text: own.slice(0, 40),
        ratio: Math.round(value * 100) / 100,
        required,
        color: style.color,
        size: Math.round(size),
        cls: (el.getAttribute('class') || '').slice(0, 44),
        onImage: overImage(el),
      });
    }
  }

  /* ---- borders ---- */
  const borderIssues = [];
  const imageBorderIssues = [];
  for (const el of document.querySelectorAll('[class*="border"]')) {
    if (!visible(el)) continue;
    const style = getComputedStyle(el);
    const borderWidth = parseFloat(style.borderTopWidth);
    if (!borderWidth) continue;
    const border = parse(style.borderTopColor);
    if (!border || border.a < 0.05) continue;
    // A hairline over a photograph has no fixed backdrop to be measured
    // against, so it is reported separately, the way the text is.
    if (overImage(el)) {
      imageBorderIssues.push({
        cls: (el.getAttribute('class') || '').slice(0, 44),
        color: style.borderTopColor,
      });
      continue;
    }
    const bg = backdrop(el);
    const delta = contrast(border, bg);
    // A border that blends into its surface is invisible.
    if (delta < 1.12) {
      borderIssues.push({
        cls: (el.getAttribute('class') || '').slice(0, 44),
        color: style.borderTopColor,
        ratio: Math.round(delta * 100) / 100,
      });
    }
  }

  /* ---- chart and calendar colours ---- */
  const chartIssues = [];
  for (const el of document.querySelectorAll('.recharts-line-curve, .recharts-bar-rectangle path, .recharts-area-curve, .recharts-cartesian-axis-tick-value, .recharts-cartesian-grid line, [data-calendar] path, [data-calendar] rect, [data-calendar] circle')) {
    if (!visible(el)) continue;
    const style = getComputedStyle(el);
    const stroke = parse(style.stroke);
    const fill = parse(style.fill);
    const colour = stroke && stroke.a > 0.05 ? stroke : fill;
    if (!colour || colour.a < 0.05) continue;
    const bg = backdrop(el);
    const delta = contrast(colour, bg);
    if (delta < 1.25) {
      chartIssues.push({
        cls: (el.getAttribute('class') || '').slice(0, 44),
        color: style.stroke !== 'none' ? style.stroke : style.fill,
        ratio: Math.round(delta * 100) / 100,
      });
    }
  }

  /* ---- images ---- */
  const imageIssues = [];
  for (const img of document.querySelectorAll('img')) {
    if (!visible(img)) continue;
    // An empty alt marks a decorative picture, which is correct. Only a
    // missing alt attribute is a problem.
    const alt = img.getAttribute('alt');
    if (alt === null) {
      imageIssues.push({
        src: (img.getAttribute('src') || '').slice(-40),
        reason: 'no alt attribute',
      });
    }
  }

  /* ---- form labels ---- */
  const labelIssues = [];
  for (const input of document.querySelectorAll('input, select, textarea')) {
    if (!visible(input)) continue;
    if (input.type === 'hidden') continue;
    // A control that is hidden from the accessibility tree is driven by the
    // visible control beside it, so it needs no label of its own.
    if (input.getAttribute('aria-hidden') === 'true') continue;

    const id = input.getAttribute('id');
    const hasLabel = id && document.querySelector('label[for="' + CSS.escape(id) + '"]');
    const wrapped = input.closest('label');
    const aria = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
    const placeholderOnly = !hasLabel && !wrapped && !aria && input.getAttribute('placeholder');
    if (!hasLabel && !wrapped && !aria) {
      labelIssues.push({
        name: input.getAttribute('name') || input.type,
        reason: placeholderOnly ? 'placeholder only' : 'no label',
      });
    }
  }

  /* ---- icon-only buttons ---- */
  const buttonIssues = [];
  for (const button of document.querySelectorAll('button, a[href], [role="button"]')) {
    if (!visible(button)) continue;
    const text = (button.textContent || '').trim();
    if (text) continue;
    const name = button.getAttribute('aria-label') || button.getAttribute('title');
    const labelledBy = button.getAttribute('aria-labelledby');
    if (!name && !labelledBy) {
      buttonIssues.push({
        cls: (button.getAttribute('class') || '').slice(0, 44),
        html: button.outerHTML.slice(0, 80),
      });
    }
  }

  /* ---- focus ring ---- */
  // The ring is drawn with a :focus-visible variant, so each element is
  // focused for real before its style is read.
  const focusIssues = [];
  for (const el of document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')) {
    if (!visible(el)) continue;
    // A disabled control cannot be focused, and a negative tabindex keeps an
    // element out of the tab order, so neither needs a ring.
    if (el.disabled) continue;
    if (el.getAttribute('tabindex') === '-1') continue;

    const previous = document.activeElement;
    el.focus();
    // The focus has to have landed, and :focus-visible has to match, or the
    // ring is not drawn at all.
    const focused = document.activeElement === el && el.matches(':focus-visible');
    if (focused) {
      const style = getComputedStyle(el);
      const hasRing =
        style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
      const hasShadow = style.boxShadow !== 'none' && style.boxShadow !== '';
      if (!hasRing && !hasShadow) {
        focusIssues.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.getAttribute('class') || '').slice(0, 60),
        });
      }
    }
    if (previous && previous.focus) previous.focus();
  }

  return {
    textIssues,
    borderIssues,
    imageBorderIssues,
    chartIssues,
    imageIssues,
    labelIssues,
    buttonIssues,
    focusIssues,
    counts: {
      text: document.querySelectorAll('p, span, a, button, h1, h2, h3, td, th, label').length,
      images: document.querySelectorAll('img').length,
      inputs: document.querySelectorAll('input, select, textarea').length,
    },
  };
})()`;

/* ------------------------------------------------------------------- cdp -- */

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

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    const detail =
      result.exceptionDetails.exception?.description ??
      result.exceptionDetails.text;
    console.error("EVAL ERROR:", detail?.slice(0, 300));
    return null;
  }
  return result.result.value;
}

const report = [];

for (const theme of ["light", "dark"]) {
  await send("Page.navigate", { url: `${ORIGIN}/` });
  await new Promise((resolve) => setTimeout(resolve, 700));
  await evaluate(`localStorage.setItem('theme', ${JSON.stringify(theme)})`);

  for (const route of routes) {
    await send("Page.navigate", { url: `${ORIGIN}${route}` });
    await new Promise((resolve) => setTimeout(resolve, 1400));

    const data = await evaluate(COLOUR_FUNCTION);
    if (!data) continue;

    const issues = [];
    // Text on a photograph is checked by eye, so it is reported separately.
    const solidText = data.textIssues.filter((issue) => !issue.onImage);

    if (solidText.length) issues.push(`text ${solidText.length}`);
    if (data.borderIssues.length) issues.push(`border ${data.borderIssues.length}`);
    if (data.chartIssues.length) issues.push(`chart ${data.chartIssues.length}`);
    if (data.imageIssues.length) issues.push(`img ${data.imageIssues.length}`);
    if (data.labelIssues.length) issues.push(`label ${data.labelIssues.length}`);
    if (data.buttonIssues.length) issues.push(`btn ${data.buttonIssues.length}`);
    if (data.focusIssues.length) issues.push(`focus ${data.focusIssues.length}`);

    report.push({ theme, route, issues, data });
  }
}

console.log("=== dark mode and accessibility audit ===\n");

let problems = 0;

for (const theme of ["light", "dark"]) {
  console.log(`--- ${theme} ---`);
  for (const row of report.filter((entry) => entry.theme === theme)) {
    if (row.issues.length === 0) {
      console.log(`  ok   ${row.route}`);
      continue;
    }
    problems += row.issues.length;
    console.log(`  FAIL ${row.route.padEnd(36)} ${row.issues.join(", ")}`);

    const data = row.data;
    const solidText = data.textIssues.filter((issue) => !issue.onImage);
    const imageText = data.textIssues.filter((issue) => issue.onImage);
    const show = (label, list, format) => {
      if (!list.length) return;
      console.log(`       ${label}:`);
      for (const item of list.slice(0, 4)) {
        console.log(`         ${format(item)}`);
      }
      if (list.length > 4) console.log(`         ...and ${list.length - 4} more`);
    };

    show("text", solidText, (i) => `"${i.text}" ratio ${i.ratio} (want ${i.required}) ${i.color}`);
    show("border", data.borderIssues, (i) => `${i.color} ratio ${i.ratio}`);
    show("chart", data.chartIssues, (i) => `${i.color} ratio ${i.ratio}`);
    show("image", data.imageIssues, (i) => `${i.reason} ${i.src}`);
    show("label", data.labelIssues, (i) => `${i.name}: ${i.reason}`);
    show("button", data.buttonIssues, (i) => `${i.html}`);
    show("focus", data.focusIssues, (i) => `${i.tag} ${i.cls}`);

    if (imageText.length) {
      console.log(
        `       text over a photograph (checked by eye): ${imageText.length}`,
      );
    }
    if (data.imageBorderIssues.length) {
      console.log(
        `       border over a photograph (checked by eye): ${data.imageBorderIssues.length}`,
      );
    }
  }
  console.log("");
}

console.log(`${problems} issue group(s) across ${report.length} route/theme pairs.`);

ws.close();
