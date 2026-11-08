/**
 * Prints the direct children of the "Dashboard content" frame of an extracted
 * Figma frame, which is the block layout of the page body.
 *
 * Usage: node scripts/qa/content-blocks.mjs <file>
 */
import fs from "node:fs";

const file = process.argv[2];
const text = fs.readFileSync(file, "utf8");

const lines = text.split("\n");
let inContent = false;
let depth = 0;

for (const line of lines) {
  const open = line.match(/^\s*<frame id="([^"]+)" name="([^"]*)"/);
  const close = line.match(/^\s*<\/frame>/);

  if (open && !inContent) {
    if (open[2] === "Dashboard content") {
      inContent = true;
      depth = 1;
      console.log(`CONTENT ${open[1]} ${line.match(/width="([^"]+)"/)[1]}x${line.match(/height="([^"]+)"/)[1]}`);
    }
    continue;
  }

  if (!inContent) continue;

  if (close) {
    depth -= 1;
    if (depth === 0) break;
    continue;
  }

  if (open) {
    depth += 1;
    // Direct children only.
    if (depth === 2) {
      const id = open[1];
      const name = open[2];
      const x = (line.match(/x="([^"]+)"/) ?? [])[1];
      const y = (line.match(/y="([^"]+)"/) ?? [])[1];
      const w = (line.match(/width="([^"]+)"/) ?? [])[1];
      const h = (line.match(/height="([^"]+)"/) ?? [])[1];
      console.log(`  ${id.padEnd(10)} ${name.padEnd(28)} ${x},${y} ${w}x${h}`);
    }
    continue;
  }

  // A text node that is a direct child of the content frame.
  const textNode = line.match(/^\s*<text id="([^"]+)" name="([^"]*)" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/);
  if (textNode && depth === 1) {
    console.log(`  ${textNode[1].padEnd(10)} ${textNode[2].slice(0, 26).padEnd(28)} ${textNode[3]},${textNode[4]} ${textNode[5]}x${textNode[6]}`);
  }
}
