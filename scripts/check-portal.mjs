/**
 * Runs the existing portal compare script across every role, breakpoint and
 * theme and prints a pass/fail summary.
 *
 * Usage: node scripts/check-portal.mjs
 */

import { spawnSync } from "node:child_process";

const routes = [
  "/student/dashboard",
  "/teacher/dashboard",
  "/admin/dashboard",
];
const widths = [1440, 768, 375];
const themes = ["light", "dark"];

let failures = 0;
const rows = [];

for (const route of routes) {
  for (const width of widths) {
    for (const theme of themes) {
      const args = ["scripts/compare-portal.mjs", route, String(width)];
      if (theme === "dark") args.push("--dark");

      const result = spawnSync(process.execPath, args, {
        cwd: process.cwd(),
        encoding: "utf8",
      });
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
      const ok =
        output.includes("ALL WITHIN TOLERANCE") &&
        output.includes("ALL CHECKS PASSED");
      if (!ok) failures += 1;

      const role = route.split("/")[1];
      rows.push({
        role,
        width,
        theme,
        ok,
        detail: ok ? "" : output.replace(/\s+/g, " ").slice(0, 400),
      });
    }
  }
}

for (const row of rows) {
  const mark = row.ok ? "PASS" : "FAIL";
  console.log(
    `${mark}  ${row.role.padEnd(8)} ${String(row.width).padStart(4)} ${row.theme.padEnd(5)}` +
      (row.ok ? "" : `\n      ${row.detail}`),
  );
}

console.log(
  failures === 0
    ? `\nAll ${rows.length} portal shells are within 6px of Figma.`
    : `\n${failures} of ${rows.length} portal shells are out of tolerance.`,
);

process.exit(failures === 0 ? 0 : 1);
