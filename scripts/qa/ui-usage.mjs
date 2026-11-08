/**
 * Lists every import of src/components/ui, so a primitive that nothing uses
 * can be told apart from one that does.
 *
 * Usage: node scripts/qa/ui-usage.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    if (/\.(tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk("src");
const usage = new Map();

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/from\s+"@\/components\/ui\/([a-z-]+)"/g)) {
    const name = match[1];
    if (!usage.has(name)) usage.set(name, []);
    usage.get(name).push(file);
  }
}

for (const file of walk("src/components/ui")) {
  const name = path.basename(file).replace(/\.tsx?$/, "");
  const users = usage.get(name) ?? [];
  console.log(
    users.length === 0
      ? `UNUSED  ${name}`
      : `used    ${name}  (${users.length})`,
  );
}
