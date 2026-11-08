/**
 * Extracts the step 11C frames from the cached Figma payload.
 *
 * Usage: node scripts/qa/extract-11c.mjs
 */
import fs from "node:fs";

const blob =
  "C:/Users/tajan/.puku/tool-results/vscode-chat-session___local_YjQ5ODY0YzYtZTljOC00MGIwLTg0ODMtN2ZmMmM2NzUxMWI2/call_01a1a5dc21847667975262a8.txt";

const frames = [
  ["2:13668", ".tmp-admin-fees-1440.xml"],
  ["2:13874", ".tmp-admin-fees-768.xml"],
  ["2:14041", ".tmp-admin-fees-375.xml"],
  ["2:27831", ".tmp-admin-fees-1440-dark.xml"],
  ["2:27956", ".tmp-admin-fees-768-dark.xml"],
  ["2:28062", ".tmp-admin-fees-375-dark.xml"],
  ["2:14191", ".tmp-admin-audit-1440.xml"],
  ["2:14361", ".tmp-admin-audit-768.xml"],
  ["2:14492", ".tmp-admin-audit-375.xml"],
  ["2:28156", ".tmp-admin-audit-1440-dark.xml"],
  ["2:28245", ".tmp-admin-audit-768-dark.xml"],
  ["2:28315", ".tmp-admin-audit-375-dark.xml"],
  ["2:15678", ".tmp-admin-empty-1440.xml"],
  ["2:15786", ".tmp-admin-empty-768.xml"],
  ["2:15888", ".tmp-admin-empty-375.xml"],
  ["2:28378", ".tmp-admin-empty-1440-dark.xml"],
  ["2:28450", ".tmp-admin-empty-768-dark.xml"],
  ["2:28516", ".tmp-admin-empty-375-dark.xml"],
];

const text = fs.readFileSync(blob, "utf8");

for (const [id, outFile] of frames) {
  const marker = `id="${id}"`;
  const markerIndex = text.indexOf(marker);

  if (markerIndex === -1) {
    console.log(`NOT FOUND: ${id}`);
    continue;
  }

  const start = text.lastIndexOf("<frame", markerIndex);
  let depth = 0;
  const re = /<frame\b[^>]*>|<\/frame>/g;
  re.lastIndex = start;
  let match;
  let done = false;

  while ((match = re.exec(text)) !== null) {
    const token = match[0];

    if (token.startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        fs.writeFileSync(outFile, text.slice(start, match.index + token.length));
        console.log(`${id} -> ${outFile}`);
        done = true;
        break;
      }
    } else if (!token.endsWith("/>")) {
      depth += 1;
    }
  }

  if (!done) console.log(`UNTERMINATED: ${id}`);
}
