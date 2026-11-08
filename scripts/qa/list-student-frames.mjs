import fs from "node:fs";

const blob =
  "C:/Users/tajan/.puku/tool-results/vscode-chat-session___local_YjQ5ODY0YzYtZTljOC00MGIwLTg0ODMtN2ZmMmM2NzUxMWI2/call_01a1a5dc21847667975262a8.txt";

const text = fs.readFileSync(blob, "utf8");
const re = /<frame id="([^"]+)" name="([^"]*)"/g;
let match;
const wanted = process.argv.slice(2);
while ((match = re.exec(text)) !== null) {
  if (wanted.length === 0 || wanted.some((w) => match[2].includes(w))) {
    console.log(`${match[1].padEnd(10)} ${match[2]}`);
  }
}
