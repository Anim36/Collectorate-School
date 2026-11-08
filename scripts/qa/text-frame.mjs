/**
 * Prints every text node of an extracted Figma frame with its full content.
 * Figma stores the copy in the node name when the payload is flattened.
 *
 * Usage: node scripts/qa/text-frame.mjs <file>
 */
import fs from "node:fs";

const file = process.argv[2];
const text = fs.readFileSync(file, "utf8");

const re = /<text\b([^>]*?)(?:\/>|>([\s\S]*?)<\/text>)/g;
let match;
let count = 0;

while ((match = re.exec(text)) !== null) {
  const attrs = match[1];
  const id = (attrs.match(/id="([^"]+)"/) ?? [])[1] ?? "";
  const x = (attrs.match(/x="([^"]+)"/) ?? [])[1] ?? "";
  const y = (attrs.match(/y="([^"]+)"/) ?? [])[1] ?? "";
  const w = (attrs.match(/width="([^"]+)"/) ?? [])[1] ?? "";
  const h = (attrs.match(/height="([^"]+)"/) ?? [])[1] ?? "";
  const name = (attrs.match(/name="([^"]*)"/) ?? [])[1] ?? "";
  const body = (match[2] ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const content = body || name;
  console.log(`${id}  @${x},${y} ${w}x${h}  "${content}"`);
  count += 1;
}

console.log(`--- ${count} text nodes in ${file}`);
