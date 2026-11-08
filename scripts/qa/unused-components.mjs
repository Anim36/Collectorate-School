/**
 * Lists the components in src/components that no other file imports, so an
 * unused component is found before it is committed.
 *
 * Usage: node scripts/qa/unused-components.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const COMPONENTS = "src/components";

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

// Every import that names a component, as the path after "@/". A dynamic
// import counts too, so a lazily loaded component is not reported as unused.
const imported = new Set();
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/from\s+"@\/([^"]+)"/g)) {
    imported.add(match[1]);
  }
  for (const match of text.matchAll(/import\(\s*"@\/([^"]+)"\)/g)) {
    imported.add(match[1]);
  }
}

const unused = [];

for (const file of walk(COMPONENTS)) {
  const alias = file.replace(/\\/g, "/").replace(/^src\//, "").replace(/\.tsx?$/, "");
  // The component file is imported through its own path.
  if (imported.has(alias)) continue;
  // A component imported through its folder index is rare here, so the bare
  // file name is checked as well.
  const base = path.basename(alias);
  if ([...imported].some((entry) => entry.endsWith(`/${base}`))) continue;

  unused.push(alias);
}

console.log(unused.length === 0 ? "no unused components" : unused.join("\n"));
