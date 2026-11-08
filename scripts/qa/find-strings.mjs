import fs from "node:fs";

const blob =
  "C:/Users/tajan/.puku/tool-results/vscode-chat-session___local_YjQ5ODY0YzYtZTljOC00MGIwLTg0ODMtN2ZmMmM2NzUxMWI2/call_01a1a5dc21847667975262a8.txt";

const text = fs.readFileSync(blob, "utf8");

const found = new Set();
for (const match of text.matchAll(/name="([^"]*)"/g)) {
  const value = match[1];
  if (value.startsWith("Showing") || value.includes("720K")) {
    found.add(value);
  }
}

for (const value of [...found].sort()) {
  console.log(JSON.stringify(value));
}
