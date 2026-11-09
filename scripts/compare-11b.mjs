/**
 * Compares the step 11B admin pages against the Figma frame measurements.
 *
 * Usage: node scripts/compare-11b.mjs <route> <width> [--dark]
 *   e.g. node scripts/compare-11b.mjs /admin/notices 1440
 *
 * The Figma values come from the cached canvas metadata for the step 11B
 * frames:
 *   "Admin / Notices"  (2:11912 / 2:12070 / 2:12189 and the dark twins)
 *   "Admin / Gallery"  (2:12301 / 2:12470 / 2:12600 and the dark twins)
 *   "Admin / Routine"  (2:12718 / 2:12906 / 2:13055 and the dark twins)
 *   "Admin / Calendar" (2:13191 / 2:13380 / 2:13530 and the dark twins)
 *
 * Every frame draws the workspace below the 108px (88px on mobile) top bar,
 * so the blocks are measured relative to the content area.
 */

/** The block offsets of every frame, measured from the top of the content. */
const expected = {
  "/admin/notices": {
    1440: {
      content: { top: 108, height: 1115 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "title", top: 149, height: 76 },
        { label: "category", top: 249, height: 76 },
        { label: "editor", top: 349, height: 250 },
        { label: "audienceHeading", top: 623, height: 35 },
        { label: "audiences", top: 682, height: 23 },
        { label: "attachments", top: 729, height: 138 },
        { label: "publishDate", top: 891, height: 76 },
        { label: "controls", top: 991, height: 49 },
        { label: "draftNote", top: 1064, height: 19 },
      ],
    },
    768: {
      content: { top: 108, height: 1115 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "title", top: 149, height: 76 },
        { label: "category", top: 249, height: 76 },
        { label: "editor", top: 349, height: 250 },
        { label: "audienceHeading", top: 623, height: 35 },
        { label: "audiences", top: 682, height: 23 },
        { label: "attachments", top: 729, height: 138 },
        { label: "publishDate", top: 891, height: 76 },
        { label: "controls", top: 991, height: 49 },
        { label: "draftNote", top: 1064, height: 19 },
      ],
    },
    375: {
      content: { top: 88, height: 1314 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "title", top: 159, height: 99 },
        { label: "category", top: 282, height: 76 },
        { label: "editor", top: 382, height: 319 },
        { label: "audienceHeading", top: 725, height: 35 },
        { label: "audiences", top: 784, height: 23 },
        { label: "attachments", top: 831, height: 161 },
        { label: "publishDate", top: 1016, height: 76 },
        { label: "controls", top: 1116, height: 112 },
        { label: "draftNote", top: 1252, height: 38 },
      ],
    },
  },
  "/admin/gallery": {
    1440: {
      content: { top: 108, height: 869 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "createAlbum", top: 149, height: 47 },
        { label: "filters", top: 220, height: 76 },
        { label: "albumsTable", top: 320, height: 308 },
        { label: "upload", top: 652, height: 185 },
      ],
    },
    768: {
      content: { top: 108, height: 869 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "createAlbum", top: 149, height: 47 },
        { label: "filters", top: 220, height: 76 },
        { label: "albumsTable", top: 320, height: 308 },
        { label: "upload", top: 652, height: 185 },
      ],
    },
    375: {
      content: { top: 88, height: 1119 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "createAlbum", top: 159, height: 47 },
        { label: "filters", top: 230, height: 168 },
        { label: "albumsTable", top: 422, height: 429 },
        { label: "upload", top: 875, height: 220 },
      ],
    },
  },
  "/admin/routine": {
    1440: {
      content: { top: 108, height: 925 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "table", top: 249, height: 428 },
        { label: "note", top: 701, height: 19 },
        { label: "selectedPeriod", top: 744, height: 76 },
        { label: "actions", top: 844, height: 49 },
      ],
    },
    768: {
      content: { top: 108, height: 925 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "table", top: 249, height: 428 },
        { label: "note", top: 701, height: 19 },
        { label: "selectedPeriod", top: 744, height: 76 },
        { label: "actions", top: 844, height: 49 },
      ],
    },
    375: {
      content: { top: 88, height: 1482 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "filters", top: 159, height: 168 },
        { label: "table", top: 351, height: 809 },
        { label: "note", top: 1184, height: 38 },
        { label: "selectedPeriod", top: 1246, height: 76 },
        { label: "actions", top: 1346, height: 112 },
      ],
    },
  },
  "/admin/calendar": {
    1440: {
      content: { top: 108, height: 1150 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "addEvent", top: 249, height: 47 },
        { label: "eventsTable", top: 320, height: 368 },
        { label: "eventDetails", top: 712, height: 35 },
        { label: "eventTitle", top: 771, height: 76 },
        { label: "dateFilters", top: 871, height: 76 },
        { label: "eventType", top: 971, height: 76 },
        { label: "saveEvent", top: 1071, height: 47 },
      ],
    },
    768: {
      content: { top: 108, height: 1190 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "addEvent", top: 249, height: 47 },
        { label: "eventsTable", top: 320, height: 408 },
        { label: "eventDetails", top: 752, height: 35 },
        { label: "eventTitle", top: 811, height: 76 },
        { label: "dateFilters", top: 911, height: 76 },
        { label: "eventType", top: 1011, height: 76 },
        { label: "saveEvent", top: 1111, height: 47 },
      ],
    },
    375: {
      content: { top: 88, height: 1517 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "filters", top: 159, height: 168 },
        { label: "addEvent", top: 351, height: 47 },
        { label: "eventsTable", top: 422, height: 549 },
        { label: "eventDetails", top: 995, height: 35 },
        { label: "eventTitle", top: 1054, height: 76 },
        { label: "dateFilters", top: 1154, height: 168 },
        { label: "eventType", top: 1346, height: 76 },
        { label: "saveEvent", top: 1446, height: 47 },
      ],
    },
  },
};

const route = process.argv[2] ?? "/admin/notices";
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
      if (style.display === 'none') {
        // A hidden element takes no space, so it is not a block of the page.
        continue;
      } else if (style.position === 'absolute') {
        // A file input that only the screen readers read is taken out of the
        // flow, so it is not a block of the page either.
        continue;
      } else if (style.display === 'contents') {
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
