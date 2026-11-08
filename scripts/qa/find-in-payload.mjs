/**
 * Searches the cached Figma payload for a string and prints the surrounding
 * context, so a copy that is cut short in the frame dump can be recovered.
 *
 * Usage: node scripts/qa/find-in-payload.mjs <string> [around]
 */
import fs from "node:fs";

const blob =
  "C:/Users/tajan/.puku/tool-results/vscode-chat-session___local_YjQ5ODY0YzYtZTljOC00MGIwLTg0ODMtN2ZmMmM2NzUxMWI2/call_01a1a5dc21847667975262a8.txt";

const needle = process.argv[2];
const around = Number(process.argv[3] ?? 300);

const text = fs.readFileSync(blob, "utf8");
let index = text.indexOf(needle);
let count = 0;

while (index !== -1 && count < 5) {
  console.log(`--- hit ${count + 1} at ${index} ---`);
  console.log(JSON.stringify(text.slice(Math.max(0, index - around), index + around)));
  index = text.indexOf(needle, index + 1);
  count += 1;
}

if (count === 0) console.log("NO HIT");
