import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/tajan/.puku/tool-results";
const needle = process.argv[2];
const limit = Number(process.argv[3] ?? 3);

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".txt")) files.push(full);
  }
})(root);

let shown = 0;
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes("data-node-id")) continue;
  let index = text.indexOf(needle);
  let count = 0;
  while (index !== -1 && count < limit && shown < 12) {
    console.log(`\n##### ${file.split(/[\\/]/).pop()}`);
    console.log(text.slice(Math.max(0, index - 1400), index + 900));
    shown += 1;
    count += 1;
    index = text.indexOf(needle, index + needle.length);
  }
  if (shown >= 12) break;
}
if (shown === 0) console.log(`NO MATCH "${needle}"`);
