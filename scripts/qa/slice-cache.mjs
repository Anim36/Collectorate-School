/**
 * Copies a cached Figma payload slice around a node id into a review file.
 *
 * Usage: node scripts/qa/slice-cache.mjs <nodeId> <outFile> [window]
 */
import fs from "node:fs";
import path from "node:path";

const base = "C:/Users/tajan/.puku/tool-results";
const needle = process.argv[2] ?? "2:16071";
const outFile = process.argv[3] ?? "figma-pages/slice.txt";
const windowSize = Number(process.argv[4] ?? 4000);

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
  const slice = text.slice(Math.max(0, index - 600), index + windowSize);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, slice);
  console.log(`wrote ${outFile} (${slice.length} chars) from ${path.basename(file)}`);
  process.exit(0);
}

console.log(`NOT FOUND: ${needle}`);
