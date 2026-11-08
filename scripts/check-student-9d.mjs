/**
 * Runs the step 9D comparison with the probes of the payment method page or
 * the receipt page.
 *
 * Usage: node scripts/check-student-9d.mjs <route> <width>
 */
import { spawn } from "node:child_process";

import { payPageProbes, receiptPageProbes } from "./student-9d-probes.mjs";

const route = process.argv[2] ?? "/student/fees/pay";
const width = Number(process.argv[3] ?? 1440);

const probes = route.includes("/receipt/")
  ? receiptPageProbes(width)
  : payPageProbes(width);

const child = spawn(
  process.execPath,
  [
    "scripts/compare-student.mjs",
    route,
    String(width),
    `--probes=${JSON.stringify(probes)}`,
  ],
  { stdio: "inherit" },
);

child.on("exit", (code) => process.exit(code ?? 0));
