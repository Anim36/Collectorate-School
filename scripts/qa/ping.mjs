/** Checks that thedev server and the CDP browser are both reachable. */
import { writeFileSync } from "node:fs";

const out = [];
try {
  const r = await fetch("http://localhost:3111");
  out.push(`app 3111 -> ${r.status}`);
} catch (e) {
  out.push(`app 3111 -> ${e.message}`);
}
try {
  const j = await (await fetch("http://localhost:9222/json")).json();
  out.push("cdp 9222 -> " + j.map((t) => `${t.type} ${t.url}`).join(" | "));
} catch (e) {
  out.push(`cdp 9222 -> ${e.message}`);
}
writeFileSync(".tmp-ping.txt", out.join("\n"));
console.log("written");
