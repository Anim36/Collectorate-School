/**
 * Prints the header of every script, so the ones to keep and the ones to move
 * into scripts/qa/ can be told apart.
 *
 * Usage: node scripts/qa/script-headers.mjs
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
    const lines = readFileSync(full, "utf8").split("\n");
    const header = lines
      .filter((line) => line.trim().startsWith("*") || line.trim().startsWith("#"))
      .map((line) => line.replace(/^\s*[*/#]+\s?/, "").trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(" — ");
    out.push(`${full}\t${header}`);
  }
  return out;
}

console.log(walk(ROOT).sort().join("\n"));
