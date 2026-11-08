/**
 * Prints the ancestor chain and absolute position of a Figma node from the
 * cached canvas metadata.
 *
 * Usage: node scripts/qa/node-tree.mjs <nodeId>
 */
import fs from "node:fs";

const blob =
  "C:/Users/tajan/.puku/tool-results/vscode-chat-session___local_YjQ5ODY0YzYtZTljOC00MGIwLTg0ODMtN2ZmMmM2NzUxMWI2/call_01a1a5dc21847667975262a8.txt";

const nodeId = process.argv[2] ?? "2:2421";

const text = fs.readFileSync(blob, "utf8");

// Walk the serialised tree, tracking the open element stack with positions.
const stack = [];
let found = null;

const tagRe =
  /<(\/?)(frame|group|text|rect|ellipse|image|instance|component|section)\s+([^>]*?)(\/?)>/g;

let match;
while ((match = tagRe.exec(text)) !== null) {
  const closing = match[1] === "/";
  const type = match[2];
  const attrs = match[3];
  const selfClosing = match[4] === "/";

  if (closing) {
    stack.pop();
    continue;
  }

  const idMatch = attrs.match(/\bid="([^"]+)"/);
  const xMatch = attrs.match(/\bx="([^"]+)"/);
  const yMatch = attrs.match(/\by="([^"]+)"/);
  const wMatch = attrs.match(/\bwidth="([^"]+)"/);
  const hMatch = attrs.match(/\bheight="([^"]+)"/);
  const nameMatch = attrs.match(/\bname="([^"]*)"/);

  const node = {
    type,
    id: idMatch ? idMatch[1] : "?",
    name: nameMatch ? nameMatch[1] : "",
    x: xMatch ? Number(xMatch[1]) : 0,
    y: yMatch ? Number(yMatch[1]) : 0,
    w: wMatch ? Number(wMatch[1]) : 0,
    h: hMatch ? Number(hMatch[1]) : 0,
  };

  if (node.id === nodeId) {
    found = node;
  }

  if (!selfClosing) {
    stack.push(node);
  }
}

if (!found) {
  console.log("NODE NOT FOUND");
  process.exit(1);
}

let absX = found.x;
let absY = found.y;

console.log(`node ${found.id} "${found.name}" (${found.type})`);
console.log(`  local  x=${found.x} y=${found.y} w=${found.w} h=${found.h}`);
console.log(`  abs    x=${absX} y=${absY}`);

for (const ancestor of stack.slice().reverse()) {
  absX += ancestor.x;
  absY += ancestor.y;
  console.log(
    `  ancestor ${ancestor.id.padEnd(9)} "${ancestor.name}" local ${ancestor.x},${ancestor.y} size ${ancestor.w}x${ancestor.h} -> abs ${absX},${absY}`,
  );
}
