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

const targets = process.argv.slice(2);

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes("data-name=")) continue;
  const hits = targets.filter((t) => text.includes(`data-name="${t}"`));
  if (hits.length === 0) continue;
  console.log(`\n##### ${file.split(/[\\/]/).pop()}  (${text.length} bytes)`);
  for (const hit of hits) console.log(`   "${hit}"`);
}
