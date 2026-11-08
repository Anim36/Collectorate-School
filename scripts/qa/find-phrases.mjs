/**
 * Searches every cached Figma blob for each phrase and prints the exact
 * surrounding characters so truncated node names can be recovered.
 *
 * Usage: node scripts/qa/find-phrases.mjs "<phrase1>" "<phrase2>" ...
 */
import fs from "node:fs";
import path from "node:path";

const root =
  "C:/Users/tajan/.puku/tool-results/vscode-chat-session___local_YjQ5ODY0YzYtZTljOC00MGIwLTg0ODMtN2ZmMmM2NzUxMWI2";
const phrases = process.argv.slice(2);

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".txt")) files.push(full);
  }
}
walk(root);

for (const phrase of phrases) {
  let found = false;
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    let index = text.indexOf(phrase);
    while (index !== -1) {
      found = true;
      console.log(`### ${path.basename(file)} :: ${phrase}`);
      console.log(JSON.stringify(text.slice(Math.max(0, index - 160), index + 320)));
      console.log();
      index = text.indexOf(phrase, index + phrase.length);
    }
  }
  if (!found) console.log(`### NOT FOUND :: ${phrase}\n`);
}
