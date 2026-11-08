import fs from "node:fs";

const [file, id, outFile] = process.argv.slice(2);
const text = fs.readFileSync(file, "utf8");

const marker = `id="${id}"`;
const markerIndex = text.indexOf(marker);
if (markerIndex === -1) {
  console.log(`NOT FOUND: ${id}`);
  process.exit(1);
}

const start = text.lastIndexOf("<frame", markerIndex);
let depth = 0;
const re = /<frame\b[^>]*>|<\/frame>/g;
re.lastIndex = start;
let match;
while ((match = re.exec(text)) !== null) {
  const token = match[0];
  if (token.startsWith("</")) {
    depth -= 1;
    if (depth === 0) {
      const out = text.slice(start, match.index + token.length);
      if (outFile) {
        fs.writeFileSync(outFile, out);
        console.log(`wrote ${outFile} (${out.length} chars)`);
      } else {
        console.log(out);
      }
      process.exit(0);
    }
  } else if (!token.endsWith("/>")) {
    depth += 1;
  }
}
console.log("unterminated frame");
