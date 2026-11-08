/**
 * Lists cached Figma text nodes that use a given height so the type scale
 * can be calibrated against the rendered boxes.
 *
 * Usage: node scripts/qa/dump-text-heights.mjs 57
 */
import fs from "node:fs";

const height = process.argv[2] ?? "57";
const text = fs.readFileSync(".tmp-figma-blob.txt", "utf8");

const re = /<text id="([^"]+)" name="([^"]*)" x="([^"]*)" y="([^"]*)" width="([^"]*)" height="([^"]*)"/g;
const seen = new Set();
let match;
let count = 0;
while ((match = re.exec(text)) !== null) {
  if (match[6] !== height) continue;
  const key = `${match[1]}`;
  if (seen.has(key)) continue;
  seen.add(key);
  count += 1;
  if (count > 30) break;
  console.log(`${match[1].padEnd(9)} w=${match[5].padStart(7)} h=${match[6]}  ${JSON.stringify(match[2])}`);
}
console.log(`\n${count} nodes with height ${height}`);
