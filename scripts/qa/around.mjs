import fs from "node:fs";

const [file, needle, before, after] = process.argv.slice(2);
const text = fs.readFileSync(file, "utf8");
const index = text.indexOf(needle);
if (index === -1) {
  console.log("NOT FOUND");
  process.exit(1);
}
console.log(
  text
    .slice(Math.max(0, index - Number(before ?? 0)), index + Number(after ?? 3000))
    .replace(/\s{3,}/g, "\n"),
);
