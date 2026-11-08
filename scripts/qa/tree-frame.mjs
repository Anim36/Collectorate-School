/**
 * Prints the frame tree of an extracted Figma frame, one node per line, with
 * the node id, kind, name, geometry and text content.
 *
 * Usage: node scripts/qa/tree-frame.mjs <file> [outFile]
 */
import fs from "node:fs";

const [file, outFile] = process.argv.slice(2);
const text = fs.readFileSync(file, "utf8");

const lines = [];
const re = /<(frame|text|instance|rounded-rectangle|ellipse|rectangle|vector)\b([^>]*?)\/?>/g;
let match;

while ((match = re.exec(text)) !== null) {
  const kind = match[1];
  const attrs = match[2];
  const id = (attrs.match(/id="([^"]+)"/) ?? [])[1] ?? "";
  const name = (attrs.match(/name="([^"]*)"/) ?? [])[1] ?? "";
  const x = (attrs.match(/x="([^"]+)"/) ?? [])[1] ?? "";
  const y = (attrs.match(/y="([^"]+)"/) ?? [])[1] ?? "";
  const w = (attrs.match(/width="([^"]+)"/) ?? [])[1] ?? "";
  const h = (attrs.match(/height="([^"]+)"/) ?? [])[1] ?? "";
  lines.push(
    `${kind.padEnd(17)} ${id.padEnd(9)} ${x.padStart(6)},${y.padStart(6)} ${w.padStart(10)}x${h.padEnd(8)} ${name}`,
  );
}

const target = outFile ?? ".tmp-tree.txt";
fs.writeFileSync(target, lines.join("\n"));
console.log(`wrote ${target} (${lines.length} nodes)`);
