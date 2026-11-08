import fs from "node:fs";

const base = "C:/Users/tajan/.puku/tool-results";
const needle = process.argv[2] ?? "Birth certificate";
const window = Number(process.argv[3] ?? 800);

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".txt")) files.push(full);
  }
})(base);

const seen = new Set();
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  let index = text.indexOf(needle);
  let count = 0;
  while (index !== -1 && count < 4) {
    const snippet = text.slice(Math.max(0, index - 150), index + window);
    const key = snippet.slice(0, 200);
    if (!seen.has(key)) {
      seen.add(key);
      console.log(`\n##### ${file}`);
      console.log(snippet);
    }
    index = text.indexOf(needle, index + needle.length);
    count += 1;
  }
}
if (seen.size === 0) console.log(`NO MATCH "${needle}"`);
