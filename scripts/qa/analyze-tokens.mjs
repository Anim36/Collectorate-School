import fs from "node:fs";

const path = process.argv[2];
const text = fs.readFileSync(path, "utf8");

const uniq = (re) => [...new Set(text.match(re) ?? [])].sort().join("  ");

console.log("SIZES   :", uniq(/text-\[[0-9.]+px\]/g));
console.log("LEADING :", uniq(/leading-\[[0-9.]+\]/g));
console.log("RADIUS  :", uniq(/rounded-\[[0-9.]+px\]/g));
console.log("GAP     :", uniq(/gap-\[[0-9.]+px\]/g));
console.log("PAD     :", uniq(/p[xytblr]?-\[[0-9.]+px\]/g));
console.log("COLORV  :", uniq(/var\(--[a-z-]+[^)]*\)/g));
console.log("HEIGHTS :", uniq(/h-\[[0-9.]+px\]/g));
console.log("WIDTHS  :", uniq(/w-\[[0-9.]+px\]/g));
console.log("FONTPAIR:", uniq(/font-\['[^']+'\] font-[a-z]+/g));
