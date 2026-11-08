import fs from "node:fs";
import { getDefaultConfig } from "tailwind-merge";

const config = getDefaultConfig();
fs.writeFileSync(
  "E:/Narail Collectorate School/figma-tmp/merge-config.json",
  JSON.stringify(config.theme.text, null, 1),
);
console.log("written");
