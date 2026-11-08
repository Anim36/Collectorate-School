/**
 * Prints a cached Figma payload slice around several node ids at once.
 *
 * Usage: node scripts/qa/peek-multi.mjs "<id1> <id2> ..." [window]
 */
import fs from "node:fs";
import path from "node:path";

const base = "C:/Users/tajan/.puku/tool-results";
const ids = (process.argv[2] ?? "2:2240").split(" ").filter(Boolean);
const windowSize = Number(process.argv[3] ?? 3000);

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".txt")) files.push(full);
  }
})(base);

const loaded = files.map((file) => [file, fs.readFileSync(file, "utf8")]);

for (const id of ids) {
  let printed = false;
  for (const [file, text] of loaded) {
    const index = text.indexOf(`data-node-id="${id}"`);
    if (index === -1) continue;
    console.log(`\n########## ${id} :: ${path.basename(file)} ##########`);
    console.log(text.slice(Math.max(0, index - 600), index + windowSize));
    printed = true;
    break;
  }
  if (!printed) console.log(`\n########## ${id} :: NOT FOUND ##########`);
}
