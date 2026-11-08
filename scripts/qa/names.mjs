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

const names = new Map();
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes("data-node-id")) continue;
  for (const match of text.matchAll(/data-name="([^"]+)"/g)) {
    const name = match[1];
    if (!names.has(name)) names.set(name, { count: 0, files: new Set() });
    const entry = names.get(name);
    entry.count += 1;
    entry.files.add(file.split(/[\\/]/).pop());
  }
}

const sorted = [...names.entries()].sort((a, b) => b[1].count - a[1].count);
console.log(`distinct data-name values: ${sorted.length}\n`);
for (const [name, entry] of sorted) {
  console.log(`${String(entry.count).padStart(4)}  ${name}`);
}
