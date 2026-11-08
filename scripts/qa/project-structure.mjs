/**
 * Prints the project structure and the routes, so the README can list them.
 *
 * Usage: node scripts/qa/project-structure.mjs
 */
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

function walk(dir, depth = 0) {
  const out = [];
  for (const entry of readdirSync(dir).sort()) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    const isDir = statSync(full).isDirectory();
    out.push(`${"  ".repeat(depth)}${entry}${isDir ? "/" : ""}`);
    if (isDir && depth < 2) out.push(...walk(full, depth + 1));
  }
  return out;
}

for (const dir of ["src/components", "src/hooks", "src/lib", "src/types", "src/data"]) {
  console.log(`\n== ${dir} ==`);
  console.log(walk(dir).join("\n"));
}

console.log("\n== public ==");
console.log(walk("public").join("\n"));
