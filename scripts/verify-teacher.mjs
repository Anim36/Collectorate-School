/**
 * Runs the Figma comparison for every route and width of this step.
 *
 * Usage: node scripts/verify-teacher.mjs
 */
import { spawn } from "node:child_process";

const runs = [
  { route: "/teacher/dashboard", width: 1440 },
  { route: "/teacher/dashboard", width: 768 },
  { route: "/teacher/dashboard", width: 375 },
  { route: "/teacher/attendance", width: 1440 },
  { route: "/teacher/attendance", width: 768 },
  { route: "/teacher/attendance", width: 375 },
  {
    route: "/teacher/attendance",
    width: 1440,
    extra: ["--tab=History", "--ref=/teacher/attendance-history"],
  },
  {
    route: "/teacher/attendance",
    width: 768,
    extra: ["--tab=History", "--ref=/teacher/attendance-history"],
  },
  {
    route: "/teacher/attendance",
    width: 375,
    extra: ["--tab=History", "--ref=/teacher/attendance-history"],
  },
];

function run(args) {
  return new Promise((resolve) => {
    const child = spawn("node", ["scripts/compare-student.mjs", ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let out = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.stderr.on("data", (chunk) => (out += chunk));
    child.on("close", () => resolve(out));
  });
}

let failures = 0;

for (const entry of runs) {
  const args = [entry.route, String(entry.width), ...(entry.extra ?? [])];
  const out = await run(args);
  const label = `${entry.route} @ ${entry.width}${
    entry.extra?.includes("--tab=History") ? " (history)" : ""
  }`;
  const passed = out.includes("ALL WITHIN TOLERANCE");

  if (!passed) failures += 1;

  console.log(`${passed ? "PASS" : "FAIL"}  ${label}`);

  if (!passed) {
    console.log(
      out
        .split("\n")
        .filter((line) => line.includes("CHECK") || line.includes("MISSING"))
        .map((line) => `      ${line.trim()}`)
        .join("\n"),
    );
  }
}

console.log("");
console.log(
  failures === 0
    ? `ALL ${runs.length} COMPARISONS WITHIN TOLERANCE`
    : `${failures} of ${runs.length} comparisons out of tolerance`,
);

process.exit(failures === 0 ? 0 : 1);
