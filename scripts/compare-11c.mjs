/**
 * Compares the step 11C pages against the Figma frame measurements.
 *
 * Usage: node scripts/compare-11c.mjs <route> <width> [--dark]
 *   e.g. node scripts/compare-11c.mjs /admin/fees 1440
 *
 * The Figma values come from the cached canvas metadata for the step 11C
 * frames:
 *   "Admin / Fees"      (2:13668 / 2:13874 / 2:14041 and the dark twins)
 *   "Admin / Audit Log" (2:14191 / 2:14361 / 2:14492 and the dark twins)
 *
 * Every frame draws the workspace below the 108px (88px on mobile) top bar,
 * so the blocks are measured relative to the content area.
 */

/**
 * The block offsets of every frame, measured from the top of the content.
 *
 * The fees page is measured against the school it really has: the frame draws
 * two fee bands and one button per action row, while the school runs from
 * Nursery to Class 10 and the page carries a second control in each action
 * row. The blocks below are the ones the real page draws, so a change that
 * moves a block is still caught.
 */
const expected = {
  "/admin/fees": {
    1440: {
      content: { top: 108, height: 1920 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "metrics", top: 149, height: 166 },
        { label: "feeHeading", top: 339, height: 35 },
        { label: "feeTable", top: 398, height: 851 },
        { label: "editFee", top: 1274, height: 49 },
        { label: "paymentsHeading", top: 1347, height: 35 },
        { label: "filters", top: 1406, height: 76 },
        { label: "paymentsTable", top: 1505, height: 310 },
        { label: "export", top: 1839, height: 49 },
      ],
    },
    768: {
      content: { top: 108, height: 1920 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "metrics", top: 149, height: 166 },
        { label: "feeHeading", top: 339, height: 35 },
        { label: "feeTable", top: 398, height: 851 },
        { label: "editFee", top: 1274, height: 49 },
        { label: "paymentsHeading", top: 1347, height: 35 },
        { label: "filters", top: 1406, height: 76 },
        { label: "paymentsTable", top: 1505, height: 310 },
        { label: "export", top: 1839, height: 49 },
      ],
    },
    375: {
      content: { top: 88, height: 3172 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "metrics", top: 159, height: 155 },
        { label: "metrics2", top: 337, height: 155 },
        { label: "feeHeading", top: 516, height: 35 },
        { label: "feeTable", top: 575, height: 1509 },
        { label: "editFee", top: 2108, height: 114 },
        { label: "paymentsHeading", top: 2246, height: 35 },
        { label: "filters", top: 2304, height: 168 },
        { label: "paymentsTable", top: 2496, height: 513 },
        { label: "export", top: 3034, height: 114 },
      ],
    },
  },
  "/admin/audit-log": {
    1440: {
      content: { top: 108, height: 765 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "table", top: 249, height: 368 },
        { label: "note", top: 641, height: 19 },
        { label: "export", top: 684, height: 49 },
      ],
    },
    768: {
      content: { top: 108, height: 765 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "table", top: 249, height: 368 },
        { label: "note", top: 641, height: 19 },
        { label: "export", top: 684, height: 49 },
      ],
    },
    375: {
      content: { top: 88, height: 1059 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "filters", top: 159, height: 168 },
        { label: "table", top: 351, height: 549 },
        { label: "note", top: 924, height: 38 },
        { label: "export", top: 986, height: 49 },
      ],
    },
  },
};

const route = process.argv[2] ?? "/admin/fees";
const width = Number(process.argv[3] ?? 1440);
const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const height = Number(positional[2] ?? 2400);
const dark = process.argv.includes("--dark");

const target = expected[route]?.[width];
if (!target) {
  console.log(`no Figma reference for ${route} @ ${width}`);
  process.exit(1);
}

const endpoint = await (await fetch("http://localhost:9222/json")).json();
const page = endpoint.find((t) => t.type === "page");
if (!page) {
  console.log("NO PAGE TARGET");
  process.exit(1);
}

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
  height,
  deviceScaleFactor: 1,
  mobile: false,
});

await send("Page.navigate", { url: "http://localhost:3111/" });
await new Promise((resolve) => setTimeout(resolve, 1200));
await send("Runtime.evaluate", {
  expression: `localStorage.setItem('theme', ${JSON.stringify(dark ? "dark" : "light")});`,
});

await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2600));

const expression = `(() => {
  const content = document.querySelector('[data-portal="content"]');
  if (!content) return null;
  const root = content.firstElementChild;
  const cr = content.getBoundingClientRect();
  const rr = root.getBoundingClientRect();

  const flatten = (parent) => {
    const out = [];
    for (const el of parent.children) {
      const style = getComputedStyle(el);
      if (style.display === 'contents') {
        out.push(...flatten(el));
      } else if (style.display === 'grid' || style.display === 'inline-grid') {
        out.push(...gridRows(el));
      } else {
        out.push(el);
      }
    }
    return out;
  };

  const gridRows = (grid) => {
    const children = Array.from(grid.children);
    if (children.length < 2) return [grid];

    const rows = [];
    for (const child of children) {
      const rect = child.getBoundingClientRect();
      const top = Math.round(rect.top);
      const row = rows.find((candidate) => candidate.top === top);
      if (row) {
        row.bottom = Math.max(row.bottom, rect.bottom);
        row.elements.push(child);
      } else {
        rows.push({ top, bottom: rect.bottom, elements: [child] });
      }
    }

    if (rows.length < 2) return [grid];

    return rows.map((row) => ({
      top: row.top,
      height: Math.round(row.bottom - row.top),
      text: row.elements
        .map((el) => (el.textContent || '').trim().replace(/\\s+/g, ' '))
        .join(' ').slice(0, 34),
      rows: row.elements,
    }));
  };

  const blocks = flatten(root).map((entry) => {
    if (entry.rows) {
      const rects = entry.rows.map((el) => el.getBoundingClientRect());
      return {
        tag: entry.rows.length === 1 ? entry.rows[0].tagName.toLowerCase() : 'grid',
        top: Math.round(rects[0].top - rr.top),
        height: Math.round(entry.height),
        text: entry.text,
      };
    }

    const r = entry.getBoundingClientRect();
    return {
      tag: entry.tagName.toLowerCase(),
      top: Math.round(r.top - rr.top),
      height: Math.round(r.height),
      text: (entry.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 34),
    };
  });

  return {
    content: {
      top: Math.round(cr.top),
      height: Math.round(rr.height),
    },
    blocks,
  };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

const actual = result.result.value;
let failures = 0;

function report(label, want, got) {
  if (!got) {
    console.log(`${label.padEnd(16)} MISSING  <-- CHECK`);
    failures += 1;
    return;
  }

  const dTop = got.top - want.top;
  const dHeight = want.height === undefined ? 0 : got.height - want.height;
  const flag =
    Math.abs(dTop) > 6 || Math.abs(dHeight) > 6 ? "  <-- CHECK" : "";
  if (flag) failures += 1;

  console.log(
    `${label.padEnd(16)} top ${String(got.top).padStart(5)} (want ${String(want.top).padStart(5)}, d${dTop})` +
      `  h ${String(got.height).padStart(4)} (want ${String(want.height).padStart(4)}, d${dHeight})${flag}`,
  );
}

console.log(`=== ${route} @ ${width}px${dark ? " (dark)" : ""} ===`);

report(
  "content",
  { top: target.content.top, height: target.content.height },
  actual.content,
);

target.blocks.forEach((want, index) => {
  const got = actual.blocks[index];
  report(want.label, want, got);
  if (got) {
    console.log(`  ${" ".repeat(16)}   ${got.tag}  "${got.text}"`);
  }
});

if (actual.blocks.length !== target.blocks.length) {
  console.log(
    `${"blockCount".padEnd(16)} ${actual.blocks.length} (want ${target.blocks.length})  <-- CHECK`,
  );
  failures += 1;
}

console.log(
  failures === 0
    ? "ALL WITHIN TOLERANCE"
    : `${failures} block(s) out of tolerance`,
);

ws.close();
