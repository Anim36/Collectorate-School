/**
 * Checks every in-page anchor link against the anchors the target page
 * renders, so a link to "#fees" that lands nowhere is caught.
 *
 * Usage: node scripts/qa/anchor-targets.mjs
 */

const ORIGIN = "http://localhost:3111";

/** The anchors of the pages that carry section ids. */
const PAGES = [
  "/",
  "/admission",
  "/about",
  "/teachers",
  "/notice",
  "/calendar",
  "/gallery",
  "/routine",
  "/login",
];

/** The links with a fragment that the app renders. */
const FRAGMENT_LINKS = [
  { href: "/admission#fees", target: "/admission", fragment: "fees" },
  { href: "/admission#apply", target: "/admission", fragment: "apply" },
];

const anchorsByPage = new Map();

for (const page of PAGES) {
  const html = await (await fetch(`${ORIGIN}${page}`)).text();
  const ids = new Set(
    [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]),
  );
  anchorsByPage.set(page, ids);
}

const results = [];

for (const link of FRAGMENT_LINKS) {
  const ids = anchorsByPage.get(link.target) ?? new Set();
  const ok = ids.has(link.fragment);
  results.push({
    href: link.href,
    ok,
    detail: ok
      ? `anchor "${link.fragment}" exists on ${link.target}`
      : `anchor "${link.fragment}" is MISSING on ${link.target}`,
  });
}

for (const result of results) {
  console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.href.padEnd(22)} ${result.detail}`);
}

const failed = results.filter((result) => !result.ok);
console.log(
  failed.length === 0
    ? "\nAll fragment links resolve."
    : `\n${failed.length} fragment link(s) do not resolve.`,
);

process.exit(failed.length === 0 ? 0 : 1);
