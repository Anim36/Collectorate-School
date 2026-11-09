/**
 * Prints the cached Figma frames named "Utility bar", with the geometry of
 * their children, so the utility bar can be matched at every breakpoint.
 *
 * Usage: node scripts/qa/find-utility-bar.mjs
 */
import fs from "node:fs";
import path from "node:path";

const base = "C:/Users/tajan/.puku/tool-results";

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".txt")) files.push(full);
  }
})(base);

const seen = new Set();

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const pattern = /<frame id="([^"]+)" name="Utility bar"[^>]*width="(\d+)"[^>]*>/g;
  let match = pattern.exec(text);
  while (match) {
    const key = `${match[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      const start = match.index;
      const end = text.indexOf("</frame>", start);
      console.log(`\n===== ${match[1]} (width ${match[2]}) =====`);
      console.log(text.slice(start, end + 8));
    }
    match = pattern.exec(text);
  }
}

if (seen.size === 0) console.log("NO UTILITY BAR FRAMES IN THE CACHE");
