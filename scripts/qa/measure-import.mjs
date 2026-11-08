/**
 * Prints the block geometry of the open CSV import panel.
 *
 * Usage: node scripts/qa/measure-import.mjs <width>
 */
const width = Number(process.argv[2] ?? 375);

const endpoint = await (await fetch("http://localhost:9222/json")).json();
const page = endpoint.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
});

await new Promise((resolve) => ws.addEventListener("open", resolve));
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height: 2400,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", {
  url: "http://localhost:3111/admin/users?import=csv",
});
await new Promise((resolve) => setTimeout(resolve, 2000));

await send("Runtime.evaluate", {
  expression: `(() => {
    const button = [...document.querySelectorAll("button")].find(
      (candidate) => candidate.textContent.trim() === "Bulk CSV import",
    );
    if (button) button.click();
    return "clicked";
  })()`,
});
await new Promise((resolve) => setTimeout(resolve, 900));

const result = await send("Runtime.evaluate", {
  expression: `(() => {
    const panel = [...document.querySelectorAll("section")].find((s) =>
      s.textContent.includes("Import school accounts"),
    );
    if (!panel) return "no panel";
    const pr = panel.getBoundingClientRect();
    const children = [...panel.children].map((child) => {
      const r = child.getBoundingClientRect();
      return {
        tag: child.tagName.toLowerCase(),
        top: Math.round(r.top - pr.top),
        h: Math.round(r.height),
        text: (child.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 40),
      };
    });
    return { h: Math.round(pr.height), children };
  })()`,
  returnByValue: true,
});

console.log(JSON.stringify(result.result.value, null, 2));
ws.close();
