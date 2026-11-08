/**
 * Lists the exports of every file in src/data, so the backend handoff can name
 * the table each file becomes.
 *
 * Usage: node scripts/qa/data-exports.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const DATA_DIR = "src/data";

const lines = [];

for (const file of readdirSync(DATA_DIR).sort()) {
  if (!file.endsWith(".ts")) continue;
  const text = readFileSync(path.join(DATA_DIR, file), "utf8");

  const exports = [];
  const re = /export\s+(?:const|function|interface|type|class)\s+([A-Za-z0-9_]+)/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    exports.push(match[1]);
  }

  lines.push(`${file} (${exports.length} exports)`);
  for (const name of exports) lines.push(`  ${name}`);
}

console.log(lines.join("\n"));
