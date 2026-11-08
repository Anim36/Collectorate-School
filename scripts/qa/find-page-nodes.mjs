import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/tajan/.puku/tool-results";

const targets = [
  "2:640", "2:736", "2:827",
  "2:916", "2:1013", "2:1105",
  "2:1196", "2:1293", "2:1386",
  "2:662", "2:942", "2:1222",
  "2:666", "2:839",
];

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".txt")) files.push(full);
  }
})(root);

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes("data-node-id")) continue;
  const found = targets.filter((id) => text.includes(`data-node-id="${id}"`));
  if (found.length > 0) {
    console.log(`${file}\n   -> ${found.join(", ")}`);
  }
}
