/**
 * Prints the full text of a Figma node from the cached payload.
 *
 * Usage: node scripts/qa/node-text.mjs 2:12053
 */
import fs from "node:fs";

const blob =
  "C:/Users/tajan/.puku/tool-results/vscode-chat-session___local_YjQ5ODY0YzYtZTljOC00MGIwLTg0ODMtN2ZmMmM2NzUxMWI2/call_01a1a5dc21847667975262a8.txt";

const text = fs.readFileSync(blob, "utf8");

for (const id of process.argv.slice(2)) {
  const marker = `id="${id}"`;
  const index = text.indexOf(marker);
  if (index === -1) {
    console.log(`${id}: NOT FOUND`);
    continue;
  }

  const tagEnd = text.indexOf(">", index);
  const selfClosing = text[tagEnd - 1] === "/";
  const tag = text.slice(index, tagEnd + 1);

  console.log(`\n${id}  ${tag}`);

  if (!selfClosing) {
    const close = text.indexOf(`</text>`, tagEnd);
    const body = text.slice(tagEnd + 1, close);
    console.log(JSON.stringify(body));
  }
}
