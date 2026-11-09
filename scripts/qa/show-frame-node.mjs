/**
 * Prints one node of an extracted Figma frame, with its box.
 *
 * The frames are extracted by `scripts/qa/extract-11b.mjs`; this reads one of
 * them and prints the node the script is asked for.
 *
 * Usage: node scripts/qa/show-frame-node.mjs <file> <nodeId>
 */

import { readFileSync } from "node:fs";

const file = process.argv[2];
const nodeId = process.argv[3];

if (!file || !nodeId) {
  console.log("usage: node scripts/qa/show-frame-node.mjs <file> <nodeId>");
  process.exit(1);
}

const source = readFileSync(file, "utf8").replace(/\s+/g, " ");

const pattern = new RegExp(`<[^>]*id="${nodeId}"[^>]*>`);

const match = pattern.exec(source);

process.stdout.write(
  (match ? match[0] : `node ${nodeId} not found in ${file}`) + "\n",
);
