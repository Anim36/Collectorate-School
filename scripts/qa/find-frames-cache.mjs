/**
 * Finds the cached Figma payload that holds a set of node ids.
 *
 * Usage: node scripts/qa/find-frames-cache.mjs 2:11912 2:12301
 */
import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/tajan/.puku/tool-results";
const ids = process.argv.slice(2);

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".txt")) files.push(full);
  }
})(root);

const hits = new Map(ids.map((id) => [id, []]));

for (const file of files) {
  const stat = fs.statSync(file);
  if (stat.size < 20000) continue;

  const text = fs.readFileSync(file, "utf8");
  for (const id of ids) {
    if (text.includes(`id="${id}"`)) hits.get(id).push(file);
  }
}

for (const id of ids) {
  const found = hits.get(id);
  console.log(`${id}: ${found.length} file(s)`);
  for (const file of found.slice(0, 5)) {
    console.log(`   ${file} (${fs.statSync(file).size} bytes)`);
  }
}
