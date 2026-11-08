import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/tajan/.puku/tool-results";

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".txt")) files.push(full);
  }
})(root);

const all = new Map();
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes("data-node-id")) continue;
  for (const match of text.matchAll(/data-node-id="([\d]+):(\d+)"/g)) {
    const key = `${match[1]}:${match[2]}`;
    if (!all.has(key)) all.set(key, new Set());
    all.get(key).add(file);
  }
}

const ids = [...all.keys()].sort((a, b) => {
  const [af, an] = a.split(":").map(Number);
  const [bf, bn] = b.split(":").map(Number);
  return af - bf || an - bn;
});

console.log(`unique node ids: ${ids.length}`);
console.log("max:", ids[ids.length - 1]);

const publicPageIds = ids.filter((id) => {
  const n = Number(id.split(":")[1]);
  return (n >= 600 && n <= 1900) || (n >= 16000 && n <= 19000);
});
console.log(`\npublic-page-range ids found: ${publicPageIds.length}`);
for (const id of publicPageIds.slice(0, 80)) {
  const filesFor = all.get(id);
  console.log(`${id}  (${filesFor.size} file(s))  ${[...filesFor][0].split(/[\\/]/).pop()}`);
}
