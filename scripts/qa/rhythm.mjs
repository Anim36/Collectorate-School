import fs from "node:fs";

/**
 * Prints the internal vertical rhythm of a cached Figma frame so the
 * spacing between child frames can be reproduced exactly.
 */
const file = process.argv[2];
const id = process.argv[3];

const text = fs.readFileSync(file, "utf8");
const marker = `id="${id}"`;
const markerIndex = text.indexOf(marker);
if (markerIndex === -1) {
  console.log("NOT FOUND");
  process.exit(1);
}

const start = text.lastIndexOf("<frame", markerIndex);
let depth = 0;
const re = /<frame\b[^>]*>|<\/frame>/g;
re.lastIndex = start;
let match;
let end = text.length;
while ((match = re.exec(text)) !== null) {
  const token = match[0];
  if (token.startsWith("</")) {
    depth -= 1;
    if (depth === 0) {
      end = match.index + token.length;
      break;
    }
  } else if (!token.endsWith("/>")) {
    depth += 1;
  }
}

const frame = text.slice(start, end);

// Direct children only (one level of nesting).
const childRe = /<frame id="([\d:]+)" name="([^"]*)" x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)"/g;
let depthNow = 0;
const lines = frame.split("\n");
const children = [];

for (const line of lines) {
  const opens = (line.match(/<frame\b/g) ?? []).length;
  const closes = (line.match(/<\/frame>/g) ?? []).length;
  const m = childRe.exec(line);
  if (m && depthNow === 1) {
    children.push({
      id: m[1],
      name: m[2],
      x: Number(m[3]),
      y: Number(m[4]),
      w: Number(m[5]),
      h: Number(m[6]),
    });
  }
  childRe.lastIndex = 0;
  depthNow += opens - closes;
}

const frameTag = frame.slice(0, frame.indexOf(">") + 1);
console.log(frameTag);
console.log("");
let prevBottom = null;
for (const child of children) {
  const gap = prevBottom === null ? "" : child.y - prevBottom;
  console.log(
    `  y=${String(child.y).padStart(5)} h=${String(child.h).padStart(5)} bottom=${String(child.y + child.h).padStart(5)}` +
      `  gapAbove=${gap === "" ? "-" : String(gap).padStart(4)}  x=${String(child.x).padStart(6)} w=${String(child.w).padStart(8)}  ${child.name}`,
  );
  prevBottom = child.y + child.h;
}
const frameH = Number(frameTag.match(/height="([\d.]+)"/)?.[1] ?? 0);
console.log(`\n  frame height ${frameH}; last child bottom ${prevBottom}; trailing ${frameH - prevBottom}`);
