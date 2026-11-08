/**
 * Step 12 route inventory.
 *
 * Walks every route under src/app, loads it at every breakpoint in both
 * themes, and reports the HTTP status, the console errors and the links that
 * point at a route the app does not serve.
 *
 * Usage: node scripts/qa/route-inventory.mjs
 */

import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const APP_DIR = path.resolve("src/app");
const ORIGIN = "http://localhost:3111";

/* --------------------------------------------------- the route inventory -- */

/**
 * Turns the src/app tree into the routes it serves. The route groups in
 * parentheses do not appear in the URL, and a [param] segment becomes a
 * concrete example value.
 */
function collectRoutes(dir, prefix = "") {
  const routes = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (!statSync(full).isDirectory()) continue;

    const isGroup = entry.startsWith("(") && entry.endsWith(")");
    const segment = isGroup ? "" : entry;
    const next = `${prefix}/${segment}`.replace(/\/+$/, "");

    if (entry === "node_modules") continue;

    const pageFile = path.join(full, "page.tsx");
    if (statSyncSafe(pageFile)) {
      routes.push(next || "/");
    }

    routes.push(...collectRoutes(full, next));
  }
  return routes;
}

function statSyncSafe(file) {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

/** The concrete URLs to visit, for the dynamic segments. */
const SEGMENT_EXAMPLES = {
  "/notice/[id]": "annual-examination-schedule",
  "/student/notice/[id]": "annual-examination-schedule",
  "/gallery/[albumId]": "science-fair-2026",
  "/student/gallery/[albumId]": "science-fair-2026",
  "/student/fees/receipt/[id]": "RCPT-2026-1042",
};

function toUrl(route) {
  const example = SEGMENT_EXAMPLES[route];
  if (example) {
    return route.replace(/\[[a-zA-Z]+\]/, example);
  }
  const parts = route
    .split("/")
    .filter(Boolean)
    .map((part) => SEGMENT_EXAMPLES[part] ?? part);
  return `/${parts.join("/")}`;
}

const routes = [...new Set(collectRoutes(APP_DIR))].sort();
const urls = routes.map((route) => ({ route, url: toUrl(route) }));

/**
 * A route that only redirects is still a working route, so the status that
 * counts is the one the browser lands on.
 */
async function effectiveStatus(url) {
  const response = await fetch(`${ORIGIN}${url}`, { redirect: "follow" }).catch(
    () => null,
  );
  return response?.status ?? 0;
}

/* ---------------------------------------------------------- the CDP link -- */

const endpoint = await (await fetch("http://localhost:9222/json")).json();
const page = endpoint.find((t) => t.type === "page");
if (!page) {
  console.log("NO PAGE TARGET");
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const consoleErrors = [];

function send(method, params = {}) {
  return new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);

  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    consoleErrors.push(
      msg.params.args
        .map((a) => a.value ?? a.description ?? a.type ?? "")
        .join(" ")
        .slice(0, 200),
    );
  }

  if (msg.method === "Runtime.exceptionThrown") {
    consoleErrors.push(
      `exception: ${
        msg.params.exceptionDetails.exception?.description ??
        msg.params.exceptionDetails.text
      }`.slice(0, 200),
    );
  }

  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
});

await new Promise((resolve) => ws.addEventListener("open", resolve));
await send("Page.enable");
await send("Runtime.enable");

const WIDTHS = [1440, 768, 375];
const THEMES = ["light", "dark"];

/* ------------------------------------------------------- the link check -- */

/**
 * The route patterns, with their dynamic segments marked, so a concrete link
 * such as "/notice/admissions-2027-open" is matched against the route
 * "/notice/[id]" rather than against itself.
 */
const routePatterns = routes.map((route) => ({
  route,
  segments: route.split("/").filter(Boolean),
}));

/**
 * Whether a concrete path is served by one of the routes. A dynamic segment
 * matches any value, so the segment count is what decides.
 */
function resolvesToRoute(path) {
  const segments = path.split("/").filter(Boolean);
  return routePatterns.some(
    ({ segments: pattern }) =>
      pattern.length === segments.length &&
      pattern.every(
        (part, index) =>
          part.startsWith("[") || part === segments[index],
      ),
  );
}

/**
 * The links of a page, split by the part of the shell they belong to.
 */
const LINK_EXPRESSION = `(() => {
  const inPart = (el, part) => Boolean(el.closest(part));

  const links = Array.from(document.querySelectorAll('a[href]')).map((el) => ({
    href: el.getAttribute('href'),
    text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40),
    part: inPart(el, '[data-portal="bottom-nav"]')
      ? 'bottom-nav'
      : inPart(el, '[data-portal="sidebar"]')
        ? 'sidebar'
        : inPart(el, 'footer')
          ? 'footer'
          : inPart(el, 'header')
            ? 'navbar'
            : 'page',
  }));

  // The "More" tab opens a menu, so its entries are links too.
  const more = document.querySelector('[data-portal="bottom-nav"] button');
  if (more) {
    more.setAttribute('data-more-trigger', 'true');
  }

  return links;
})()`;

/** The links inside the "More" overflow menu, once it is open. */
const MORE_LINKS_EXPRESSION = `(() => {
  const menu = document.querySelector('[data-more-menu], [role="menu"]');
  if (!menu) return [];
  return Array.from(menu.querySelectorAll('a[href]')).map((el) => ({
    href: el.getAttribute('href'),
    text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40),
    part: 'more-menu',
  }));
})()`;

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    return { __error: result.exceptionDetails.text };
  }
  return result.result.value;
}

async function setTheme(theme) {
  await send("Page.navigate", { url: `${ORIGIN}/` });
  await new Promise((resolve) => setTimeout(resolve, 700));
  await evaluate(
    `localStorage.setItem('theme', ${JSON.stringify(theme)})`,
  );
}

async function openMoreMenu() {
  const trigger = await evaluate(`(() => {
    const button = document.querySelector('[data-portal="bottom-nav"] button');
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!trigger) return [];
  await new Promise((resolve) => setTimeout(resolve, 500));
  const links = await evaluate(MORE_LINKS_EXPRESSION);
  await evaluate(`(() => {
    document.body.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 300));
  return links ?? [];
}

/* ---------------------------------------------------------- the run -- */

const results = [];
const deadLinks = new Map();

for (const { route, url } of urls) {
  const row = { route, url, checks: [] };

  for (const theme of THEMES) {
    await setTheme(theme);

    for (const width of WIDTHS) {
      consoleErrors.length = 0;

      const status = await effectiveStatus(url);

      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 2400,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await send("Page.navigate", { url: `${ORIGIN}${url}` });
      await new Promise((resolve) => setTimeout(resolve, 1600));

      const title = await evaluate(
        `document.querySelector('main') ? 'ok' : 'no main'`,
      );
      const errors = [...consoleErrors];

      row.checks.push({
        theme,
        width,
        status,
        rendered: title === "ok",
        errors,
      });

      if (errors.length > 0) {
        for (const error of errors) {
          const key = `${url} :: ${error}`;
          deadLinks.set(key, deadLinks.get(key) ?? 0);
        }
      }

      // The links are collected once per route, not per breakpoint.
      if (theme === "light" && width === 1440) {
        const links = (await evaluate(LINK_EXPRESSION)) ?? [];
        const moreLinks = await openMoreMenu();
        row.links = [...links, ...moreLinks];
      }
    }
  }

  results.push(row);
  process.stdout.write(".");
}

console.log("\n");

/* ------------------------------------------------------ the dead links -- */

const allLinks = results.flatMap((row) =>
  (row.links ?? []).map((link) => ({ ...link, from: row.url })),
);

/** The anchors each page renders, so a fragment link can be resolved. */
const anchorsByPage = new Map();

for (const { url } of urls) {
  const html = await fetch(`${ORIGIN}${url}`).then((r) => r.text()).catch(() => "");
  anchorsByPage.set(
    url,
    new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])),
  );
}

for (const link of allLinks) {
  if (!link.href) continue;
  if (link.href.startsWith("http") || link.href.startsWith("mailto:")) continue;

  // A link to the page it is already on, with only a fragment.
  if (link.href.startsWith("#")) continue;

  const [pathPart, fragment] = link.href.split("#");
  const normalised = pathPart.replace(/\?.*$/, "");

  // A link must point at a route the app serves. A dynamic segment matches
  // any value, so only the shape of the path is compared.
  if (normalised && !resolvesToRoute(normalised)) {
    const key = `${link.from} -> ${link.href} (${link.part})`;
    deadLinks.set(key, (deadLinks.get(key) ?? 0) + 1);
    continue;
  }

  // A fragment must land on an element the target page actually renders.
  if (fragment) {
    const anchorPage = normalised || link.from;
    const anchors = anchorsByPage.get(anchorPage);
    if (anchors && !anchors.has(fragment)) {
      const key = `${link.from} -> ${link.href} (${link.part}): no "#${fragment}" on ${anchorPage}`;
      deadLinks.set(key, (deadLinks.get(key) ?? 0) + 1);
    }
  }
}

/* --------------------------------------------------------- the report -- */

console.log("=== route inventory ===");
console.log(
  `${"route".padEnd(38)} ${"1440".padEnd(18)} ${"768".padEnd(18)} ${"375".padEnd(18)}`,
);
console.log("-".repeat(94));

let failures = 0;

for (const row of results) {
  const cells = WIDTHS.map((width) => {
    const light = row.checks.find((c) => c.width === width && c.theme === "light");
    const dark = row.checks.find((c) => c.width === width && c.theme === "dark");

    const cell = (check) => {
      if (!check) return "missing";
      if (check.status !== 200) return `HTTP ${check.status}`;
      if (!check.rendered) return "no main";
      if (check.errors.length > 0) return `${check.errors.length} error`;
      return "ok";
    };

    const l = cell(light);
    const d = cell(dark);
    const bad = l !== "ok" || d !== "ok";
    if (bad) failures += 1;
    return `${l}/${d}${bad ? "!" : ""}`;
  });

  console.log(`${row.route.padEnd(38)} ${cells.join(" ")}`);
}

console.log("\n=== dead links ===");
if (deadLinks.size === 0) {
  console.log("none");
} else {
  for (const [key, count] of deadLinks) {
    console.log(`${count}x  ${key}`);
  }
}

console.log(
  `\n${results.length} routes checked, ${failures} with a problem, ` +
    `${deadLinks.size} dead link(s).`,
);

ws.close();
process.exit(failures === 0 && deadLinks.size === 0 ? 0 : 1);
