import fs from "node:fs";

const [file, needle] = process.argv.slice(2);
const text = fs.readFileSync(file, "utf8");
console.log("length:", text.length);
console.log("index:", text.indexOf(needle));
console.log("open frames:", (text.match(/<frame\b/g) ?? []).length);
console.log("close frames:", (text.match(/<\/frame>/g) ?? []).length);
console.log("tail:", JSON.stringify(text.slice(-400)));
