/**
 * Writes the full `name` attribute of cached Figma text nodes to a file.
 * Node ids are read from a plain-text list file (one id per line).
 *
 * Usage: node scripts/qa/node-texts.mjs <idsFile> <outFile>
 */
import fs from "node:fs";
import path from "node:path";

const blob =
  "C:/Users/tajan/.puku/tool-results/vscode-chat-session___local_YjQ5ODY0YzYtZTljOC00MGIwLTg0ODMtN2ZmMmM2NzUxMWI2/call_01a1a5dc21847667975262a8.txt";

const idsFile = process.argv[2] ?? "figma-pages/node-ids.txt";
const outFile = process.argv[3] ?? "figma-pages/node-texts.txt";

const ids = fs
  .readFileSync(idsFile, "utf8")
  .split(/\s+/)
  .map((id) => id.trim())
  .filter(Boolean);

const text = fs.readFileSync(blob, "utf8");
const lines = [];

for (const id of ids) {
  const re = new RegExp(
    `<text id="${id}" name="([^"]*)" x="([^"]*)" y="([^"]*)" width="([^"]*)" height="([^"]*)"`,
    "g",
  );
  let match;
  let found = false;
  while ((match = re.exec(text)) !== null) {
    found = true;
    lines.push(
      `${id}  @${match[2]},${match[3]}  ${match[4]}x${match[5]}  ::  ${match[1]}`,
    );
  }
  if (!found) lines.push(`${id} :: NOT FOUND`);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, lines.join("\n"));
console.log(`wrote ${outFile} (${lines.length} rows)`);
