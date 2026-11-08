/**
 * Lists the chunks that carry a library and says whether they are loaded with
 * the page or only on demand.
 *
 * Usage: node scripts/check-bundle.mjs <route> <needle>
 *   e.g. node scripts/check-bundle.mjs /admin/notices tiptap
 */
import fs from "node:fs";
import path from "node:path";

const route = process.argv[2] ?? "/admin/notices";
const needle = process.argv[3] ?? "tiptap";

const manifest = JSON.parse(
  fs.readFileSync(".next/app-build-manifest.json", "utf8"),
);

const eager = new Set(manifest.pages[route] ?? []);
const chunkDir = ".next/static/chunks";

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith(".js") ? [full] : [];
  });
}

console.log(`=== ${route} ===\n`);

for (const file of walk(chunkDir)) {
  const code = fs.readFileSync(file, "utf8");
  if (!code.includes(needle)) continue;

  const relative = path.relative(".next", file).replace(/\\/g, "/");
  const size = Math.round(fs.statSync(file).size / 1024);
  const loaded = eager.has(relative);

  console.log(
    `${relative.padEnd(62)} ${String(size).padStart(5)} kB  ${
      loaded ? "LOADED WITH THE PAGE" : "on demand"
    }`,
  );
}
