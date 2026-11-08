/**
 * Prints the raw Figma node markup for a list of node ids from the cached
 * canvas metadata so exact copy can be transcribed without re-encoding.
 *
 * Usage: node scripts/qa/dump-nodes.mjs 2:3221 2:3204
 */
import fs from "node:fs";

const blob = ".tmp-figma-blob.txt";
const text = fs.readFileSync(blob, "utf8");

for (const id of process.argv.slice(2)) {
  const index = text.indexOf(`id="${id}"`);
  if (index === -1) {
    console.log(`${id} NOT FOUND`);
    continue;
  }
  console.log(id, JSON.stringify(text.slice(index, index + 200)));
}
