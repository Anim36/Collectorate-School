import fs from "node:fs";
import path from "node:path";

const src = process.argv[2];
const outDir = process.argv[3];
const text = fs.readFileSync(src, "utf8");

fs.mkdirSync(outDir, { recursive: true });

const re = /^(?:function|const) ([A-Za-z0-9_]+)/gm;
const matches = [...text.matchAll(re)];
matches.forEach((m, i) => {
  const name = m[1];
  const start = m.index;
  const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
  const body = text.slice(start, end);
  fs.writeFileSync(path.join(outDir, `${name}.txt`), body);
  console.log(`${name}  (${body.length} chars)`);
});
