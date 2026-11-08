import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/tajan/.puku/tool-results";
const needles = process.argv.slice(2);

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".txt")) files.push(full);
  }
})(root);

const filesByNeedle = new Map(needles.map((n) => [n, []]));

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const needle of needles) {
    if (text.includes(needle)) filesByNeedle.get(needle).push(file);
  }
}

for (const needle of needles) {
  const found = filesByNeedle.get(needle);
  console.log(`\n### "${needle}" -> ${found.length} files`);
  for (const file of found.slice(0, 12)) {
    console.log(`   ${file} (${fs.statSync(file).size} bytes)`);
  }
}
