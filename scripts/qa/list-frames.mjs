import fs from "node:fs";

const path = process.argv[2];
const filter = process.argv[3] ?? "";
const text = fs.readFileSync(path, "utf8");

const re = /<frame id="([^"]+)" name="([^"]*)"/g;
let match;
while ((match = re.exec(text)) !== null) {
  if (!filter || match[2].includes(filter)) {
    console.log(`${match[1].padEnd(10)} ${match[2]}`);
  }
}
