/**
 * Exercises the admin portal behaviours in the browser.
 *
 * Usage: node scripts/check-admin.mjs [width]
 *
 * It drives the users page (search, role filter, pagination, the add-user
 * form, the row actions and the CSV panel) and the classes page (the add and
 * assign dialogs) and reports what each step produced.
 */

const width = Number(process.argv[2] ?? 1440);
const height = 2400;

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

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    return { error: result.exceptionDetails.text };
  }
  return result.result.value;
}

async function goto(route) {
  await send("Page.navigate", { url: `http://localhost:3111${route}` });
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

/** Sets the value of a React-controlled input and fires the input event. */
const setInput = (selector, value) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return "no input";
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value"
  ).set;
  setter.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return "ok";
})()`;

/** Sets the value of the input a label names. */
const setLabelled = (label, value) => `(() => {
  const el = [...document.querySelectorAll("label")]
    .find((l) => l.textContent.trim() === ${JSON.stringify(label)})
    ?.getAttribute("for");
  if (!el) return "no label";
  const input = document.getElementById(el);
  if (!input) return "no input";
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value"
  ).set;
  setter.call(input, ${JSON.stringify(value)});
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return "ok";
})()`;

/** The titles of every dialog that is open. */
const openDialogs = `(() => {
  return [...document.querySelectorAll('[role="dialog"] h2')].map((h) => h.textContent.trim());
})()`;

const rowNames = `(() => {
  const table = document.querySelector('table');
  if (!table) return [];
  return [...table.querySelectorAll('tbody tr')].map((tr) =>
    [...tr.children].map((td) => td.textContent.trim()).join(' | ')
  );
})()`;

console.log(`=== admin behaviours @ ${width}px ===\n`);

/* ---------------------------------------------------------- users page --- */
await goto("/admin/users");

console.log("1. initial rows");
console.log("  ", JSON.stringify(await evaluate(rowNames)));

console.log("2. search 'Nusrat'");
await evaluate(setInput('input[type="search"]', "Nusrat"));
await new Promise((resolve) => setTimeout(resolve, 400));
console.log("  ", JSON.stringify(await evaluate(rowNames)));
console.log(
  "   count line:",
  await evaluate(
    `document.querySelectorAll('p').length ? [...document.querySelectorAll('p')].map(p=>p.textContent.trim()).find(t=>t.includes('of 1,560 users') || t.includes('users')) : null`,
  ),
);

console.log("3. search cleared, role filter = Teacher");
await evaluate(setInput('input[type="search"]', ""));
await new Promise((resolve) => setTimeout(resolve, 300));
await evaluate(`(() => {
  const trigger = document.querySelector('button[aria-label="Role"], [role="combobox"]');
  if (!trigger) return "no trigger";
  trigger.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const item = [...document.querySelectorAll('[role="option"]')].find(
    (el) => el.textContent.trim() === "Teacher"
  );
  if (!item) return "no option";
  item.click();
  return "picked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
console.log("  ", JSON.stringify(await evaluate(rowNames)));

console.log("4. role filter back to All roles");
await evaluate(`(() => {
  const trigger = document.querySelector('button[aria-label="Role"], [role="combobox"]');
  trigger.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 500));
await evaluate(`(() => {
  const item = [...document.querySelectorAll('[role="option"]')].find(
    (el) => el.textContent.trim() === "All roles"
  );
  if (!item) return "no option";
  item.click();
  return "picked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 500));

console.log("5. open the Add User dialog");
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Add User"
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log(
  "   dialog:",
  await evaluate(
    `(() => { const d = document.querySelector('[role="dialog"]'); return d ? d.querySelector("h2")?.textContent.trim() : "no dialog"; })()`,
  ),
);

console.log("6. submit an empty form — the validation messages");
await evaluate(`(() => {
  const form = document.querySelector("#admin-add-user");
  if (!form) return "no form";
  form.requestSubmit();
  return "submitted";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log(
  "   errors:",
  JSON.stringify(
    await evaluate(
      `[...document.querySelectorAll('#admin-add-user p')].map(p=>p.textContent.trim()).filter(t=>t.length > 0)`,
    ),
  ),
);

console.log("7. fill a bad email and a short password");
await evaluate(setLabelled("Full name", "Sadia Rahman"));
await evaluate(setLabelled("Email", "not-an-email"));
await evaluate(setLabelled("Temporary password", "short"));
await new Promise((resolve) => setTimeout(resolve, 700));
console.log(
  "   errors:",
  JSON.stringify(
    await evaluate(
      `[...document.querySelectorAll('#admin-add-user p')].map(p=>p.textContent.trim()).filter(t=>t.length > 0)`,
    ),
  ),
);

console.log("8. fill a valid form and submit it");
await evaluate(`(() => {
  const trigger = document.querySelector('button[aria-label="Class and section"]');
  if (!trigger) return "no trigger";
  trigger.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const item = [...document.querySelectorAll('[role="option"]')].find(
    (el) => el.textContent.trim() === "Class 9 · A"
  );
  if (!item) return "no option";
  item.click();
  return "picked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 300));
await evaluate(setLabelled("Email", "sadia.rahman@example.com"));
await evaluate(setLabelled("Temporary password", "School@2026!Change"));
await new Promise((resolve) => setTimeout(resolve, 500));
await evaluate(`(() => {
  const form = document.querySelector("#admin-add-user");
  form.requestSubmit();
  return "submitted";
})()`);
await new Promise((resolve) => setTimeout(resolve, 900));
console.log(
  "   dialog closed:",
  await evaluate(`document.querySelector('[role="dialog"]') === null`),
);
console.log("  ", JSON.stringify(await evaluate(rowNames)));

console.log("9. deactivate the first row");
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Deactivate"
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("   dialogs:", JSON.stringify(await evaluate(openDialogs)));
await evaluate(`(() => {
  const btn = [...document.querySelectorAll('[role="dialog"] button')].find(
    (b) => b.textContent.trim() === "Deactivate"
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 900));
console.log("  ", JSON.stringify(await evaluate(rowNames)));

console.log("10. reset the password of the first row");
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Reset password"
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log("   dialogs:", JSON.stringify(await evaluate(openDialogs)));
console.log(
  "   toast:",
  JSON.stringify(
    await evaluate(
      `[...document.querySelectorAll('[data-radix-toast-viewport] p')].map(p=>p.textContent.trim())`,
    ),
  ),
);
await evaluate(`(() => {
  const btn = [...document.querySelectorAll('[role="dialog"] button')].find(
    (b) => b.textContent.trim() === "Cancel"
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 500));

console.log("11. open the CSV import panel");
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Bulk CSV import"
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log(
  "   panel:",
  await evaluate(
    `(() => {
       const heads = [...document.querySelectorAll("h3")].map(h=>h.textContent.trim());
       return heads.find(t=>t.includes("Import school accounts")) ?? "no panel";
     })()`,
  ),
);
console.log(
  "   preview rows:",
  await evaluate(
    `(() => {
       const tables = [...document.querySelectorAll("table")];
       return tables.map(t => t.querySelectorAll("tbody tr").length);
     })()`,
  ),
);

console.log("12. click Review import");
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Review import"
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log(
  "   review heading:",
  await evaluate(
    `(() => {
       const heads = [...document.querySelectorAll("h3")].map(h=>h.textContent.trim());
       return heads.find(t=>t.includes("Review the import")) ?? "no review";
     })()`,
  ),
);
console.log(
  "   preview table:",
  await evaluate(
    `(() => {
       const tables = [...document.querySelectorAll("table")];
       const t = tables[tables.length - 1];
       return {
         rows: t.querySelectorAll("tbody tr").length,
         headers: [...t.querySelectorAll("th")].map(h=>h.textContent.trim()),
         first: [...t.querySelectorAll("tbody tr")[0].children].map(td=>td.textContent.trim()),
       };
     })()`,
  ),
);

/* -------------------------------------------------------- classes page --- */
await goto("/admin/classes");

console.log("13. open the Add class dialog");
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Add class"
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log(
  "   dialog:",
  await evaluate(
    `(() => { const d = document.querySelector('[role="dialog"]'); return d ? d.querySelector("h2")?.textContent.trim() : "no dialog"; })()`,
  ),
);
console.log(
  "   fields:",
  JSON.stringify(
    await evaluate(
      `[...document.querySelectorAll('#admin-class label, #admin-class span')].map(e=>e.textContent.trim()).filter(t=>t.length>0)`,
    ),
  ),
);

console.log("14. submit an empty class form");
await evaluate(`(() => {
  const form = document.querySelector("#admin-class");
  form.requestSubmit();
  return "submitted";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log(
  "   errors:",
  JSON.stringify(
    await evaluate(
      `[...document.querySelectorAll('#admin-class p')].map(p=>p.textContent.trim()).filter(t=>t.length>0)`,
    ),
  ),
);

console.log("15. fill and save the class");
await evaluate(setInput("#admin-class-name", "Class 11"));
await evaluate(`(() => {
  const trigger = document.querySelector("#admin-class-teacher");
  if (!trigger) return "no trigger";
  trigger.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const item = [...document.querySelectorAll('[role="option"]')].find(
    (el) => el.textContent.trim() === "Farhana Akter"
  );
  if (!item) return "no option";
  item.click();
  return "picked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 400));
await evaluate(`(() => {
  const form = document.querySelector("#admin-class");
  form.requestSubmit();
  return "submitted";
})()`);
await new Promise((resolve) => setTimeout(resolve, 900));
console.log(
  "   class rows:",
  JSON.stringify(
    await evaluate(
      `[...document.querySelectorAll("table")][0].querySelectorAll("tbody tr").length`,
    ),
  ),
);
console.log(
  "   last row:",
  JSON.stringify(
    await evaluate(
      `[...document.querySelectorAll("table")][0].querySelectorAll("tbody tr")[5] ? [...[...document.querySelectorAll("table")][0].querySelectorAll("tbody tr")[5].children].map(td=>td.textContent.trim()) : null`,
    ),
  ),
);

console.log("16. open the Assign subject dialog");
await evaluate(`(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Assign subject"
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));
console.log(
  "   dialog:",
  await evaluate(
    `(() => { const d = document.querySelector('[role="dialog"]'); return d ? d.querySelector("h2")?.textContent.trim() : "no dialog"; })()`,
  ),
);

console.log("17. save the subject allocation");
await evaluate(`(() => {
  const trigger = document.querySelector("#admin-subject-name");
  trigger.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const item = [...document.querySelectorAll('[role="option"]')].find(
    (el) => el.textContent.trim() === "Bangla"
  );
  if (!item) return "no option";
  item.click();
  return "picked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 300));
await evaluate(`(() => {
  const trigger = document.querySelector("#admin-subject-teacher");
  trigger.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const item = [...document.querySelectorAll('[role="option"]')].find(
    (el) => el.textContent.trim() === "Rafiq Hasan"
  );
  if (!item) return "no option";
  item.click();
  return "picked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 300));
await evaluate(`(() => {
  const trigger = document.querySelector("#admin-subject-classes");
  trigger.click();
  return "clicked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 600));
await evaluate(`(() => {
  const item = [...document.querySelectorAll('[role="option"]')].find(
    (el) => el.textContent.trim() === "Class 9"
  );
  if (!item) return "no option";
  item.click();
  return "picked";
})()`);
await new Promise((resolve) => setTimeout(resolve, 300));
await evaluate(`(() => {
  const form = document.querySelector("#admin-subject");
  form.requestSubmit();
  return "submitted";
})()`);
await new Promise((resolve) => setTimeout(resolve, 900));
console.log(
  "   allocation rows:",
  JSON.stringify(
    await evaluate(
      `[...document.querySelectorAll("table")][1].querySelectorAll("tbody tr").length`,
    ),
  ),
);
console.log(
  "   last allocation:",
  JSON.stringify(
    await evaluate(
      `[...document.querySelectorAll("table")][1].querySelectorAll("tbody tr")[3] ? [...[...document.querySelectorAll("table")][1].querySelectorAll("tbody tr")[3].children].map(td=>td.textContent.trim()) : null`,
    ),
  ),
);

ws.close();
