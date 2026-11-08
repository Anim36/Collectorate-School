import fs from "node:fs";
import path from "node:path";

const [blob, outDir] = process.argv.slice(2);
const text = fs.readFileSync(blob, "utf8");

const frames = [
  ["2:640", "admission-1440-light"],
  ["2:736", "admission-768-light"],
  ["2:827", "admission-375-light"],
  ["2:17957", "admission-1440-dark"],
  ["2:18053", "admission-768-dark"],
  ["2:18146", "admission-375-dark"],
  ["2:916", "teachers-1440-light"],
  ["2:1013", "teachers-768-light"],
  ["2:1105", "teachers-375-light"],
  ["2:18237", "teachers-1440-dark"],
  ["2:18334", "teachers-768-dark"],
  ["2:18428", "teachers-375-dark"],
  ["2:1196", "about-1440-light"],
  ["2:1293", "about-768-light"],
  ["2:1386", "about-375-light"],
  ["2:18521", "about-1440-dark"],
  ["2:18618", "about-768-dark"],
  ["2:18713", "about-375-dark"],
];

fs.mkdirSync(outDir, { recursive: true });

for (const [id, name] of frames) {
  const marker = `id="${id}"`;
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) {
    console.log(`NOT FOUND: ${id} (${name})`);
    continue;
  }

  const start = text.lastIndexOf("<frame", markerIndex);
  let depth = 0;
  const re = /<frame\b[^>]*>|<\/frame>/g;
  re.lastIndex = start;
  let match;
  let done = false;

  while ((match = re.exec(text)) !== null) {
    const token = match[0];
    if (token.startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        const out = text.slice(start, match.index + token.length);
        fs.writeFileSync(path.join(outDir, `${name}.txt`), out);
        console.log(`${name}: ${out.length} chars`);
        done = true;
        break;
      }
    } else if (!token.endsWith("/>")) {
      depth += 1;
    }
  }

  if (!done) console.log(`UNTERMINATED: ${id} (${name})`);
}
