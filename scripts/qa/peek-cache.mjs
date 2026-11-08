/**
 * Prints a cached Figma payload slice around a node id.
 *
 * Usage: node scripts/qa/peek-cache.mjs <nodeId> [window]
 */
import fs from "node:fs";
import path from "node:path";

const base = "C:/Users/tajan/.puku/tool-results";
const needle = process.argv[2] ?? "2:16071";
const windowSize = Number(process.argv[3] ?? 4000);

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".txt")) files.push(full);
  }
})(base);

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const index = text.indexOf(`data-node-id="${needle}"`);
  if (index === -1) continue;
  console.log(`\n########## ${path.basename(file)} ##########`);
  console.log(text.slice(Math.max(0, index - 400), index + windowSize));
  break;
}
