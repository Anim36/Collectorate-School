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

const report = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const ids = new Set();
  for (const match of text.matchAll(/data-node-id="([\d:-]+)"/g)) ids.add(match[1]);
  if (ids.size === 0) continue;
  const numeric = [...ids]
    .map((id) => Number(id.split(":")[0]))
    .filter((n) => Number.isFinite(n));
  report.push({
    file,
    bytes: text.length,
    count: ids.size,
    min: numeric.length ? Math.min(...numeric) : 0,
    max: numeric.length ? Math.max(...numeric) : 0,
  });
}

report.sort((a, b) => b.bytes - a.bytes);
for (const row of report.slice(0, 40)) {
  console.log(
    `${String(row.bytes).padStart(9)}  nodes=${String(row.count).padStart(5)}  range=${row.min}-${row.max}  ${row.file.split(/[\\/]/).pop()}`,
  );
}
console.log(`\ntotal files with data-node-id: ${report.length}`);
