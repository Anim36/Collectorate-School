/**
 * Lists the frames of an extracted Figma page, with their boxes.
 *
 * The frames are extracted by `scripts/qa/extract-11b.mjs`; this reads one of
 * them and lists the frames it holds, so a block can be found by its name.
 *
 * Usage: node scripts/qa/list-frame-nodes.mjs <file> [name filter]
 */

import { readFileSync } from "node:fs";

const file = process.argv[2];
const filter = process.argv[3];

if (!file) {
  console.log("usage: node scripts/qa/list-frame-nodes.mjs <file> [filter]");
  process.exit(1);
}

const source = readFileSync(file, "utf8").replace(/\s+/g, " ");

const pattern = /<(frame|text|rounded-rectangle|instance) id="([^"]+)" name="([^"]*)" x="(-?[0-9.]+)" y="(-?[0-9.]+)" width="([0-9.]+)" height="([0-9.]+)"/g;

let match = pattern.exec(source);

while (match) {
  const [, kind, id, name, x, y, width, height] = match;

  if (!filter || name.toLowerCase().includes(filter.toLowerCase())) {
    process.stdout.write(
      `${kind.padEnd(18)} ${id.padEnd(10)} ${name.padEnd(38)} x=${x} y=${y} w=${width} h=${height}\n`,
    );
  }

  match = pattern.exec(source);
}
