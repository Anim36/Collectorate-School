import fs from "node:fs";

const [file, nodeId] = process.argv.slice(2);
const text = fs.readFileSync(file, "utf8");
const re = new RegExp(`<text id="${nodeId.replace(/:/g, ":")}"[^>]*>[\\s\\S]{0,1200}?</text>`, "g");
let match;
while ((match = re.exec(text)) !== null) {
  console.log(match[0]);
  console.log("=========");
}
if (!re.test(text)) {
  // fallback: print the raw line containing the id
  const idx = text.indexOf(`id="${nodeId}"`);
  console.log(idx === -1 ? "not found" : text.slice(idx - 40, idx + 1400));
}
