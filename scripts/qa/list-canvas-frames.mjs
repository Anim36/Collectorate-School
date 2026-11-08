import fs from "node:fs";

/**
 * Lists every top-level frame name in the cached canvas metadata that matches
 * a keyword, so the target frames can be located without the MCP.
 *
 * Usage: node scripts/qa/list-canvas-frames.mjs <keyword>
 */
const blob =
  "C:/Users/tajan/.puku/tool-results/vscode-chat-session___local_YjQ5ODY0YzYtZTljOC00MGIwLTg0ODMtN2ZmMmM2NzUxMWI2/call_01a1a5dc21847667975262a8.txt";

const keyword = (process.argv[2] ?? "").toLowerCase();
const text = fs.readFileSync(blob, "utf8");

const re = /<frame id="([\d:]+)" name="([^"]*)" x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)"/g;
let match;
const seen = new Set();

while ((match = re.exec(text)) !== null) {
  const [, id, name, x, y, w, h] = match;
  if (!name.toLowerCase().includes(keyword)) continue;
  const key = `${id}`;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`${id.padEnd(10)} ${String(w).padStart(7)} x ${String(h).padStart(6)}  @ ${x},${y}  ${name}`);
}
