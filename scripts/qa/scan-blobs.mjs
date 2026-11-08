import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
const needles = process.argv.slice(3);

const results = [];
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith(".txt")) continue;
  const text = fs.readFileSync(path.join(dir, file), "utf8");
  const hits = needles.filter((n) => text.includes(n));
  if (hits.length > 0) {
    results.push(`${file} :: ${hits.join(" | ")}`);
  }
}
console.log(results.length === 0 ? "NO MATCHES" : results.join("\n"));
