/**
 * Prints the geometry of the text nodes of an extracted Figma frame.
 *
 * Usage: node scripts/qa/frame-text.mjs <file.xml>
 */
import fs from "node:fs";

const file = process.argv[2];

const text = fs.readFileSync(file, "utf8");
const tag = /<text\b([^>]*?)\/?>/g;
const attrs = /(\w[\w-]*)="([^"]*)"/g;

let match;
const rows = [];

while ((match = tag.exec(text)) !== null) {
  const values = {};
  let attrMatch;
  attrs.lastIndex = 0;

  while ((attrMatch = attrs.exec(match[1])) !== null) {
    values[attrMatch[1]] = attrMatch[2];
  }

  rows.push({
    id: values.id ?? "",
    name: values.name ?? "",
    x: Number(values.x ?? 0),
    y: Number(values.y ?? 0),
    width: Number(values.width ?? 0),
    height: Number(values.height ?? 0),
  });
}

console.log(`=== ${file} ===`);

for (const row of rows) {
  console.log(
    row.id.padEnd(10) +
      row.name.slice(0, 46).padEnd(48) +
      `x ${String(row.x).padStart(5)}` +
      ` y ${String(row.y).padStart(5)}` +
      ` w ${String(row.width).padStart(5)}` +
      ` h ${String(row.height).padStart(4)}`,
  );
}
