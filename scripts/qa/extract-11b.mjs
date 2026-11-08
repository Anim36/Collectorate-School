/**
 * Extracts the step 11B frames from the cached Figma payload.
 *
 * Usage: node scripts/qa/extract-11b.mjs
 */
import fs from "node:fs";

const blob =
  "C:/Users/tajan/.puku/tool-results/vscode-chat-session___local_YjQ5ODY0YzYtZTljOC00MGIwLTg0ODMtN2ZmMmM2NzUxMWI2/call_01a1a5dc21847667975262a8.txt";

const frames = [
  ["2:11912", ".tmp-admin-notices-1440.xml"],
  ["2:12070", ".tmp-admin-notices-768.xml"],
  ["2:12189", ".tmp-admin-notices-375.xml"],
  ["2:26867", ".tmp-admin-notices-1440-dark.xml"],
  ["2:26944", ".tmp-admin-notices-768-dark.xml"],
  ["2:27002", ".tmp-admin-notices-375-dark.xml"],
  ["2:12301", ".tmp-admin-gallery-1440.xml"],
  ["2:12470", ".tmp-admin-gallery-768.xml"],
  ["2:12600", ".tmp-admin-gallery-375.xml"],
  ["2:27058", ".tmp-admin-gallery-1440-dark.xml"],
  ["2:27146", ".tmp-admin-gallery-768-dark.xml"],
  ["2:27215", ".tmp-admin-gallery-375-dark.xml"],
  ["2:12718", ".tmp-admin-routine-1440.xml"],
  ["2:12906", ".tmp-admin-routine-768.xml"],
  ["2:13055", ".tmp-admin-routine-375.xml"],
  ["2:27277", ".tmp-admin-routine-1440-dark.xml"],
  ["2:27384", ".tmp-admin-routine-768-dark.xml"],
  ["2:27472", ".tmp-admin-routine-375-dark.xml"],
  ["2:13191", ".tmp-admin-calendar-1440.xml"],
  ["2:13380", ".tmp-admin-calendar-768.xml"],
  ["2:13530", ".tmp-admin-calendar-375.xml"],
  ["2:27552", ".tmp-admin-calendar-1440-dark.xml"],
  ["2:27660", ".tmp-admin-calendar-768-dark.xml"],
  ["2:27749", ".tmp-admin-calendar-375-dark.xml"],
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
