/**
 * Prints the workspace part of an extracted Figma frame.
 *
 * Usage: node scripts/qa/show-frame.mjs <file.xml> [from] [to]
 */
import fs from "node:fs";

const file = process.argv[2];
const from = process.argv[3] ?? "Admin workspace";
const to = Number(process.argv[4] ?? Number.MAX_SAFE_INTEGER);

const text = fs.readFileSync(file, "utf8");
const start = text.indexOf(from);

console.log(`=== ${file} (${text.length} chars) ===`);
console.log(text.slice(start === -1 ? 0 : start, start === -1 ? to : start + to));
