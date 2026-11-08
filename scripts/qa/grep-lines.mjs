import fs from "node:fs";

const file = process.argv[2];
const needle = process.argv[3];
const text = fs.readFileSync(file, "utf8");

let index = text.indexOf(needle);
let count = 0;
while (index !== -1 && count < Number(process.argv[4] ?? 20)) {
  const lineStart = text.lastIndexOf("\n", index) + 1;
  const lineEnd = text.indexOf("\n", index);
  console.log(
    text
      .slice(lineStart, lineEnd === -1 ? text.length : lineEnd)
      .replace(/\s{2,}/g, "  ")
      .trim(),
  );
  index = text.indexOf(needle, index + 1);
  count += 1;
}
