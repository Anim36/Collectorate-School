import fs from "node:fs";

const [file, needle, before = "80", after = "500"] = process.argv.slice(2);
const text = fs.readFileSync(file, "utf8");
const index = text.indexOf(needle);
console.log("len", text.length, "index", index);
if (index !== -1) {
  console.log(JSON.stringify(text.slice(index - Number(before), index + Number(after))));
}
