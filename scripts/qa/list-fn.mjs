import fs from "node:fs";

const path = process.argv[2];
const text = fs.readFileSync(path, "utf8");

const fns = [...text.matchAll(/function\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]);
console.log("FUNCTIONS:", fns.join(", "));

const lines = text.split("\n");
lines.forEach((line, i) => {
  if (line.includes("data-node-id=\"2:118\"") || line.includes("data-node-id=\"2:120\"") || line.includes("data-node-id=\"2:122\"")) {
    console.log(`--- line ${i + 1} ---`);
    console.log(line.trim());
  }
});
