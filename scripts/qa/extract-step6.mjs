import fs from "node:fs";
import path from "node:path";

/**
 * Extracts the target public-page frames from the cached Figma canvas
 * metadata into individual files for geometry review.
 *
 * Usage: node scripts/qa/extract-step6.mjs <outDir>
 */
const blob =
  "C:/Users/tajan/.puku/tool-results/vscode-chat-session___local_YjQ5ODY0YzYtZTljOC00MGIwLTg0ODMtN2ZmMmM2NzUxMWI2/call_01a1a5dc21847667975262a8.txt";

const outDir = process.argv[2] ?? "figma-pages";

const frames = [
  ["2:1480", "notice-1440-light"],
  ["2:1587", "notice-768-light"],
  ["2:1688", "notice-375-light"],
  ["2:18809", "notice-1440-dark"],
  ["2:18913", "notice-768-dark"],
  ["2:19011", "notice-375-dark"],
  ["2:1786", "notice-detail-1440-light"],
  ["2:1862", "notice-detail-768-light"],
  ["2:1932", "notice-detail-375-light"],
  ["2:19106", "notice-detail-1440-dark"],
  ["2:19182", "notice-detail-768-dark"],
  ["2:19254", "notice-detail-375-dark"],
  ["2:1996", "gallery-1440-light"],
  ["2:2071", "gallery-768-light"],
  ["2:2140", "gallery-375-light"],
  ["2:19320", "gallery-1440-dark"],
  ["2:19395", "gallery-768-dark"],
  ["2:19466", "gallery-375-dark"],
  ["2:2207", "album-1440-light"],
  ["2:2269", "album-768-light"],
  ["2:2325", "album-375-light"],
  ["2:19535", "album-1440-dark"],
  ["2:19598", "album-768-dark"],
  ["2:19657", "album-375-dark"],
  ["2:2379", "calendar-1440-light"],
  ["2:2535", "calendar-768-light"],
  ["2:2686", "calendar-375-light"],
  ["2:19714", "calendar-1440-dark"],
  ["2:19870", "calendar-768-dark"],
  ["2:20023", "calendar-375-dark"],
  ["2:2834", "routine-1440-light"],
  ["2:2961", "routine-768-light"],
  ["2:3082", "routine-375-light"],
  ["2:20173", "routine-1440-dark"],
  ["2:20300", "routine-768-dark"],
  ["2:20423", "routine-375-dark"],
  ["2:15678", "notice-empty-1440-light"],
  ["2:15786", "notice-empty-768-light"],
  ["2:15888", "notice-empty-375-light"],
];

const text = fs.readFileSync(blob, "utf8");
fs.mkdirSync(outDir, { recursive: true });

for (const [id, name] of frames) {
  const marker = `id="${id}"`;
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) {
    console.log(`NOT FOUND: ${id} (${name})`);
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
        const out = text.slice(start, match.index + token.length);
        fs.writeFileSync(path.join(outDir, `${name}.txt`), out);
        console.log(`${name}: ${out.length} chars`);
        done = true;
        break;
      }
    } else if (!token.endsWith("/>")) {
      depth += 1;
    }
  }

  if (!done) console.log(`UNTERMINATED: ${id} (${name})`);
}
