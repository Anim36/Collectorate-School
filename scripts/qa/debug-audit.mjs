/**
 * Debugs the route collection of the dark mode and accessibility audit.
 *
 * Usage: node scripts/qa/debug-audit.mjs
 */

import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const APP_DIR = path.resolve("src/app");

console.log("cwd       ", process.cwd());
console.log("APP_DIR   ", APP_DIR);
console.log("exists    ", statSync(APP_DIR).isDirectory());

function collectRoutes(dir, prefix = "") {
  const routes = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    const segment = entry.startsWith("(") && entry.endsWith(")") ? "" : entry;
    const next = `${prefix}/${segment}`.replace(/\/+$/, "");
    try {
      if (statSync(path.join(full, "page.tsx")).isFile()) routes.push(next || "/");
    } catch {
      /* not a route folder */
    }
    routes.push(...collectRoutes(full, next));
  }
  return routes;
}

const routes = [...new Set(collectRoutes(APP_DIR))].sort();
console.log("routes    ", routes.length);
console.log(routes.join("\n"));
