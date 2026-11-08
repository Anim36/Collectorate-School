import fs from "node:fs";

const path = process.argv[2];
const needle = process.argv[3];
const text = fs.readFileSync(path, "utf8");

const index = text.indexOf(needle);
if (index === -1) {
  console.log("NOT FOUND");
  process.exit(1);
}
console.log(text.slice(index, index + Number(process.argv[4] ?? 8000)));
