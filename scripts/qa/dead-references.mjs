/**
 * Reports the scripts that name a file which does not exist, so a stale
 * reference is found before it is committed.
 *
 * Usage: node scripts/qa/dead-references.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
    if (/\.(mjs|js|ps1)$/.test(entry)) out.push(full);
  }
  return out;
}

const dead = [];

for (const file of walk(ROOT)) {
  const text = readFileSync(file, "utf8");

  for (const match of text.matchAll(/\b(scripts\/[A-Za-z0-9_\-./]+\.(?:mjs|js|ps1))/g)) {
    const target = match[1];
    if (existsSync(target)) continue;
    // The file may be named by the script that owns it, so a self reference
    // is allowed.
    if (target === file.replace(/\\/g, "/")) continue;
    dead.push(`${file} -> ${target}`);
  }
}

console.log(dead.length === 0 ? "no dead references" : dead.join("\n"));
