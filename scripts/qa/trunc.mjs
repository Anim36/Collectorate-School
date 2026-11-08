import fs from "node:fs";

const file =
  "C:/Users/tajan/.puku/tool-results/vscode-chat-session___local_YjQ5ODY0YzYtZTljOC00MGIwLTg0ODMtN2ZmMmM2NzUxMWI2/call_01a1a5dc21847667975262a8.txt";
const text = fs.readFileSync(file, "utf8");

const re = /<text id="([\d:]+)" name="([^"]*)"(?: x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)")?/g;
const lengths = new Map();
let match;
let count = 0;
while ((match = re.exec(text)) !== null) {
  const len = match[2].length;
  lengths.set(len, (lengths.get(len) ?? 0) + 1);
  count += 1;
}

console.log(`text nodes: ${count}`);
const sorted = [...lengths.entries()].sort((a, b) => b[0] - a[0]);
console.log("\nlongest name lengths (length -> count):");
for (const [len, n] of sorted.slice(0, 12)) console.log(`  ${len} -> ${n}`);

// Show names of length >= 46 grouped
console.log("\n--- names of length >= 46 ---");
const re2 = /<text id="([\d:]+)" name="([^"]*)"/g;
const byLen = new Map();
while ((match = re2.exec(text)) !== null) {
  if (match[2].length >= 46) {
    const key = match[2].length;
    if (!byLen.has(key)) byLen.set(key, []);
    byLen.get(key).push(match[2].replace(/\n/g, "\\n"));
  }
}
for (const key of [...byLen.keys()].sort((a, b) => b - a)) {
  console.log(`\n== length ${key} (${byLen.get(key).length} unique-ish) ==`);
  for (const name of [...new Set(byLen.get(key))].slice(0, 30)) console.log(`  "${name}"`);
}
