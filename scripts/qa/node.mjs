import fs from "node:fs";

const [file, name, outFile] = process.argv.slice(2);
const text = fs.readFileSync(file, "utf8");
const marker = `data-name="${name}"`;
const index = text.indexOf(marker);
if (index === -1) {
  console.log(`NO MATCH "${name}"`);
  process.exit(1);
}

const tagStart = text.lastIndexOf("<div", index);
const tagEnd = text.indexOf(">", index);
const output = text.slice(tagStart, tagEnd + 1) + "\n\n--- content ---\n\n" + text.slice(tagEnd + 1, tagEnd + 3000);

if (outFile) {
  fs.writeFileSync(outFile, output);
  console.log(`wrote ${outFile} (${output.length} chars)`);
} else {
  console.log(output);
}
