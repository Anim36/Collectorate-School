/**
 * Prints the flattened frame tree filtered by a name fragment.
 *
 * Usage: node scripts/qa/frame-tree.mjs <file.xml> [fragment]
 */
import fs from "node:fs";

const file = process.argv[2];
const fragment = process.argv[3] ?? "";

const text = fs.readFileSync(file, "utf8");

const tag = /<(frame|text|instance|rounded-rectangle|ellipse|vector)\b([^>]*?)(\/?)>/g;
const attrs = /(\w[\w-]*)="([^"]*)"/g;

const rows = [];
let match;

while ((match = tag.exec(text)) !== null) {
  const [, kind, rawAttrs] = match;
  const values = {};
  let attrMatch;
  attrs.lastIndex = 0;

  while ((attrMatch = attrs.exec(rawAttrs)) !== null) {
    values[attrMatch[1]] = attrMatch[2];
  }

  rows.push({
    kind,
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
  if (fragment && !row.name.includes(fragment)) continue;

  console.log(
    row.kind.padEnd(10) +
      row.id.padEnd(9) +
      row.name.slice(0, 34).padEnd(36) +
      String(row.x).padStart(8) +
      String(row.y).padStart(8) +
      String(row.width).padStart(8) +
      String(row.height).padStart(8),
  );
}
