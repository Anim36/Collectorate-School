/**
 * Compares the navbar source with the markup that is built and served.
 *
 * The band is edited in small pieces, so this shows whether the build on the
 * disk is the one that belongs to the source in the tree.
 *
 * Usage: node scripts/qa/check-navbar-build.mjs
 */

import fs from "node:fs";

const source = fs.readFileSync("src/components/layout/navbar.tsx", "utf8");

const needles = [
  "NCS",
  "Collectorate School",
  "Narail Collectorate School",
  "bg-info",
  "backdrop-blur-xl",
  "campus.jpg",
];

const built = fs.existsSync(".next/server/app/index.html")
  ? fs.readFileSync(".next/server/app/index.html", "utf8")
  : "";

const buildTime = fs.existsSync(".next/BUILD_ID")
  ? fs.statSync(".next/BUILD_ID").mtime
  : null;
const sourceTime = fs.statSync("src/components/layout/navbar.tsx").mtime;

console.log("source", sourceTime.toISOString());
console.log("build ", buildTime ? buildTime.toISOString() : "-");
console.log("");

for (const needle of needles) {
  console.log(
    `${needle.padEnd(26)} source=${String(source.includes(needle)).padEnd(5)} build=${String(built.includes(needle)).padEnd(5)}`,
  );
}

const headerAt = built.indexOf("<header");
if (headerAt >= 0) {
  console.log("\nbuilt header:");
  console.log(built.slice(headerAt, headerAt + 1500));
}
