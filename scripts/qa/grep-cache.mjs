import fs from "node:fs";
import path from "node:path";

const root = process.argv[2];
const needle = process.argv[3];
const window = Number(process.argv[4] ?? 600);

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".txt")) files.push(full);
  }
})(root);

const hits = new Map();
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  let index = text.indexOf(needle);
  while (index !== -1) {
    const key = file;
    if (!hits.has(key)) hits.set(key, []);
    hits.get(key).push(text.slice(Math.max(0, index - 120), index + window));
    index = text.indexOf(needle, index + needle.length);
    if (hits.get(key).length > 6) break;
  }
}

for (const [file, snippets] of hits) {
  console.log(`\n########## ${file}`);
  for (const snippet of snippets) {
    console.log("---");
    console.log(snippet);
  }
}
if (hits.size === 0) console.log(`NO MATCH for "${needle}"`);
