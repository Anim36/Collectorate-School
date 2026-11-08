/**
 * Searches every cached Figma blob for the widest occurrence of a phrase and
 * prints the surrounding text so truncated node names can be recovered.
 *
 * Usage: node scripts/qa/find-text.mjs "<phrase>"
 */
import fs from "node:fs";
import path from "node:path";

const root =
  "C:/Users/tajan/.puku/tool-results/vscode-chat-session___local_YjQ5ODY0YzYtZTljOC00MGIwLTg0ODMtN2ZmMmM2NzUxMWI2";
const phrase = process.argv[2];

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".txt")) files.push(full);
  }
}
walk(root);

const results = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  let index = text.indexOf(phrase);
  while (index !== -1) {
    const start = Math.max(0, index - 120);
    const end = Math.min(text.length, index + 420);
    results.push({ file: path.basename(file), len: end - start, snippet: text.slice(start, end) });
    index = text.indexOf(phrase, index + phrase.length);
  }
}

results.sort((a, b) => b.snippet.length - a.snippet.length);
for (const r of results.slice(0, 4)) {
  console.log(`--- ${r.file} (${r.len}) ---`);
  console.log(r.snippet.replace(/\r/g, ""));
  console.log();
}
