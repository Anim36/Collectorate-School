/**
 * Extracts the admin frames of step 11A from the cached Figma payload.
 *
 * Usage: node scripts/qa/extract-11a.mjs
 */
import fs from "node:fs";

const blob =
  "C:/Users/tajan/.puku/tool-results/vscode-chat-session___local_YjQ5ODY0YzYtZTljOC00MGIwLTg0ODMtN2ZmMmM2NzUxMWI2/call_01a1a5dc21847667975262a8.txt";

const frames = [
  ["2:9503", ".tmp-admin-dash-1440.xml"],
  ["2:9700", ".tmp-admin-dash-768.xml"],
  ["2:9858", ".tmp-admin-dash-375.xml"],
  ["2:10002", ".tmp-admin-users-1440.xml"],
  ["2:10180", ".tmp-admin-users-768.xml"],
  ["2:10319", ".tmp-admin-users-375.xml"],
  ["2:10445", ".tmp-admin-adduser-1440.xml"],
  ["2:10651", ".tmp-admin-adduser-768.xml"],
  ["2:10818", ".tmp-admin-adduser-375.xml"],
  ["2:10972", ".tmp-admin-csv-1440.xml"],
  ["2:11161", ".tmp-admin-csv-768.xml"],
  ["2:11311", ".tmp-admin-csv-375.xml"],
  ["2:11448", ".tmp-admin-classes-1440.xml"],
  ["2:11634", ".tmp-admin-classes-768.xml"],
  ["2:11781", ".tmp-admin-classes-375.xml"],
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
