/**
 * Step 12 Figma comparison.
 *
 * Runs the existing compare scripts for every route that has a Figma
 * reference, at every breakpoint and in both themes, and reports the largest
 * deviation per route and breakpoint.
 *
 * The portal pages are behind the sign-in, so the browser has to hold a
 * session of the right role before a portal route is measured. Without it a
 * portal route is redirected to the dashboard of the session that is open,
 * and the comparison measures the wrong page. The roles are signed in with
 * `scripts/qa/session.mjs`; the accounts it uses are made by
 * `scripts/qa/qa-admin-account.ts`, `scripts/qa/qa-portal-accounts.ts` and
 * `scripts/qa/seed-compare-account.ts`.
 *
 * Usage: node scripts/qa/figma-deviation.mjs
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { signInAs } from "./session.mjs";

const run = promisify(execFile);

const WIDTHS = [1440, 768, 375];

/**
 * The compare script that owns a route, and the route key it expects. The
 * scripts read their own Figma reference tables, so the key is the route the
 * script was written for.
 */
const COMPARATORS = [
  {
    script: "scripts/compare-home.mjs",
    role: "none",
    routes: [{ key: "home", url: "/" }],
    args: (route, width) => [String(width)],
  },
  {
    script: "scripts/compare-page.mjs",
    role: "none",
    routes: [
      { key: "/admission", url: "/admission" },
      { key: "/teachers", url: "/teachers" },
      { key: "/about", url: "/about" },
    ],
    args: (route, width) => [route.key, String(width)],
  },
  {
    script: "scripts/compare-auth.mjs",
    routes: [
      { key: "/login", url: "/login", role: "none" },
      // The page only renders for a user who still has to replace the
      // temporary password.
      { key: "/change-password", url: "/change-password", role: "MUST_CHANGE" },
    ],
    args: (route, width) => [route.key, String(width)],
  },
  {
    script: "scripts/compare-student.mjs",
    routes: [
      { key: "/student/dashboard", url: "/student/dashboard", role: "STUDENT" },
      { key: "/student/profile", url: "/student/profile", role: "STUDENT" },
      {
        key: "/student/attendance",
        url: "/student/attendance",
        role: "STUDENT",
      },
      {
        key: "/student/performance",
        url: "/student/performance",
        role: "STUDENT",
      },
      { key: "/student/result", url: "/student/result", role: "STUDENT" },
      { key: "/student/fees", url: "/student/fees", role: "STUDENT" },
      { key: "/student/fees/pay", url: "/student/fees/pay", role: "STUDENT" },
      {
        key: "/student/fees/receipt/RCPT-2026-1042",
        url: "/student/fees/receipt/RCPT-2026-1042",
        role: "STUDENT",
      },
      { key: "/student/notice", url: "/student/notice", role: "STUDENT" },
      { key: "/student/gallery", url: "/student/gallery", role: "STUDENT" },
      { key: "/teacher/dashboard", url: "/teacher/dashboard", role: "TEACHER" },
      { key: "/teacher/attendance", url: "/teacher/attendance", role: "TEACHER" },
      {
        key: "/teacher/attendance-history",
        url: "/teacher/attendance-history",
        role: "TEACHER",
      },
      { key: "/teacher/results", url: "/teacher/results", role: "TEACHER" },
      {
        key: "/teacher/results-validation",
        url: "/teacher/results-validation",
        role: "TEACHER",
      },
      { key: "/teacher/notice", url: "/teacher/notice", role: "TEACHER" },
      { key: "/teacher/gallery", url: "/teacher/gallery", role: "TEACHER" },
      { key: "/admin/dashboard", url: "/admin/dashboard", role: "ADMIN" },
      { key: "/admin/users", url: "/admin/users", role: "ADMIN" },
      { key: "/admin/classes", url: "/admin/classes", role: "ADMIN" },
      {
        key: "/admin/users?import=csv",
        url: "/admin/users?import=csv",
        role: "ADMIN",
        // The import panel is opened by the "Bulk CSV import" button, so the
        // page is put into that state before it is measured.
        eval: `(() => {
          const button = [...document.querySelectorAll('button')].find(
            (candidate) => candidate.textContent.trim() === 'Bulk CSV import',
          );
          if (button) button.click();
          return 'clicked';
        })()`,
      },
    ],
    args: (route, width) => [route.key, String(width)],
  },
  {
    script: "scripts/compare-11b.mjs",
    role: "ADMIN",
    routes: [
      { key: "/admin/notices", url: "/admin/notices" },
      { key: "/admin/gallery", url: "/admin/gallery" },
      { key: "/admin/routine", url: "/admin/routine" },
      { key: "/admin/calendar", url: "/admin/calendar" },
    ],
    args: (route, width) => [route.key, String(width)],
  },
  {
    script: "scripts/compare-11c.mjs",
    role: "ADMIN",
    routes: [
      { key: "/admin/fees", url: "/admin/fees" },
      { key: "/admin/audit-log", url: "/admin/audit-log" },
    ],
    args: (route, width) => [route.key, String(width)],
  },
  {
    script: "scripts/compare-step6.mjs",
    role: "none",
    routes: [
      { key: "/notice", url: "/notice" },
      {
        key: "/notice/annual-examination-schedule",
        url: "/notice/annual-examination-schedule",
      },
      { key: "/gallery", url: "/gallery" },
      {
        key: "/gallery/science-fair-2026",
        url: "/gallery/science-fair-2026",
      },
      { key: "/calendar", url: "/calendar" },
      { key: "/routine", url: "/routine" },
    ],
    args: (route, width) => [route.key, String(width)],
  },
];

/**
 * The largest deviation a compare script reports. Each script prints lines
 * like "top  108 (want  108, d0)" or "total height 1949 (want 1949, d0)".
 */
function maxDeviation(output) {
  let max = 0;
  let where = "";

  for (const line of output.split("\n")) {
    // The "d" values carry the deviation, e.g. "d-3" or "d12".
    for (const match of line.matchAll(/d(-?\d+)/g)) {
      const value = Math.abs(Number(match[1]));
      if (value > max) {
        max = value;
        where = line.trim();
      }
    }
  }

  return { max, where };
}

const rows = [];

for (const comparator of COMPARATORS) {
  for (const route of comparator.routes) {
    // The role of the route is signed in before it is measured. A portal
    // page measured with the wrong session shows the dashboard of that
    // session instead of the page.
    const role = route.role ?? comparator.role ?? "none";

    console.log(await signInAs(role));

    for (const width of WIDTHS) {
      for (const theme of ["light", "dark"]) {
        const args = [...comparator.args(route, width)];
        if (theme === "dark") args.push("--dark");
        if (route.eval) args.push(`--eval=${route.eval}`);

        let output = "";
        try {
          const result = await run("node", [comparator.script, ...args], {
            maxBuffer: 8 * 1024 * 1024,
          });
          output = result.stdout + result.stderr;
        } catch (error) {
          output = (error.stdout ?? "") + (error.stderr ?? "");
        }

        const { max, where } = maxDeviation(output);

        rows.push({
          script: comparator.script,
          route: route.key,
          url: route.url,
          width,
          theme,
          max,
          where,
          output,
        });
      }
    }
  }
}

/* --------------------------------------------------------- the report -- */

console.log("=== max deviation from Figma (px) ===\n");

const header = ["route", "1440", "768", "375"];
console.log(`${header[0].padEnd(36)}${header[1].padEnd(10)}${header[2].padEnd(10)}${header[3]}`);
console.log("-".repeat(66));

let over = 0;

for (const comparator of COMPARATORS) {
  for (const route of comparator.routes) {
    const cells = WIDTHS.map((width) => {
      const cell = rows.filter(
        (row) =>
          row.route === route.key && row.width === width,
      );
      const max = Math.max(...cell.map((row) => row.max));
      if (max > 6) over += 1;
      return String(max).padEnd(10);
    });
    console.log(`${route.key.padEnd(36)}${cells.join("")}`);
  }
}

console.log("\n=== anything over 6px ===");
const offenders = rows.filter((row) => row.max > 6);

if (offenders.length === 0) {
  console.log("none");
} else {
  for (const row of offenders) {
    console.log(
      `${row.route} @ ${row.width} (${row.theme})  max ${row.max}px  [${row.script}]`,
    );
    console.log(`    ${row.where}`);
  }
}

console.log(
  `\n${rows.length} comparisons, ${offenders.length} over 6px, ` +
    `${over} route/breakpoint cells over 6px.`,
);
