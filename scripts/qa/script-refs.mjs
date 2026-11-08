/**
 * Lists every cross-script reference, so a move into scripts/qa/ does not
 * break a path that is written into another script.
 *
 * Usage: node scripts/qa/script-refs.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = "scripts";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    if (!/\.(mjs|js|ps1)$/.test(entry)) continue;
    out.push(full);
  }
  return out;
}

for (const file of walk(ROOT)) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");

  lines.forEach((line, index) => {
    if (!line.includes("scripts/")) return;
    // A doc comment line that names the file itself is not a reference.
    const isSelf = line.includes(file.replace(/\\/g, "/"));
    const isComment = /^\s*(\*|#|\/\/)/.test(line);
    if (isSelf && isComment) return;

    console.log(`${file}:${index + 1}: ${line.trim()}`);
  });
}
