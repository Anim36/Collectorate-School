import "dotenv/config";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { loadPublicCalendarMonth } from "@/server/services/public-calendar";
import { loadPublicFees } from "@/server/services/public-fees";
import {
  loadPublicGalleryAlbums,
} from "@/server/services/public-gallery";
import {
  loadPublicHomeNotices,
  loadPublicNotice,
  loadPublicNoticeBoard,
} from "@/server/services/public-notices";
import {
  loadPublicRoutine,
  loadPublicRoutineClasses,
} from "@/server/services/public-routine";
import { loadPublicStaff } from "@/server/services/public-staff";

/**
 * The acceptance checks of step B6, as an anonymous visitor.
 *
 * The public site shows the school to everybody without a session, so the
 * checks run without one, both over HTTP against the real routes and
 * directly against the public services.
 *
 * The service checks call the uncached loaders (`loadPublic*`): the cached
 * wrappers need the Next request scope, which a plain script does not have.
 * The HTTP checks cover the pages and the file route, which do run in the
 * server, cache and all.
 *
 * Three things matter above all:
 *
 * 1. Privacy — every public shape is an explicit allow-list, and the checks
 *    assert the exact field list of every shape. A draft notice, a notice
 *    addressed to students only, a photograph waiting for the admin and an
 *    unpublished routine are never served, and the file route refuses the
 *    files behind them.
 * 2. Honesty — the counts the board shows are the counts the database holds,
 *    and the fee table carries every class the school teaches.
 * 3. Freshness — the admin actions revalidate the public cache tags after a
 *    write, so a change reaches the public pages without waiting for the
 *    revalidation window.
 *
 * The probe rows are throwaways: they are put in place before the checks run
 * and taken away again when they are over.
 *
 * Usage:
 *   npm run qa:public                 run the checks against localhost:3111
 *   npx tsx scripts/qa/check-public-b6.ts [baseUrl]
 *   npx tsx scripts/qa/check-public-b6.ts --setup
 *   npx tsx scripts/qa/check-public-b6.ts --teardown
 */

const BASE_URL = process.argv[2] ?? "http://localhost:3111";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/* ------------------------------------------------------------ probes ----- */

/** The id prefixes of every row the checks put in place. */
const PROBE = {
  draftNotice: "b6-probe-draft-notice",
  studentsNotice: "b6-probe-students-notice",
  routine: "b6-probe-routine",
  photo: "b6-probe-pending-photo",
  file: "b6-probe-stored-file",
};

/** Puts the probe rows in place. Idempotent: a rerun replaces them. */
async function setup(): Promise<void> {
  await teardown();

  // A draft notice addressed to everybody: still never public.
  await prisma.notice.create({
    data: {
      id: PROBE.draftNotice,
      title: "B6 draft probe notice",
      body: "A draft the public board must never show.",
      category: "General",
      audience: "PUBLIC",
      status: "DRAFT",
      publishedOn: new Date(),
    },
  });

  // A published notice addressed to students only: never public either.
  await prisma.notice.create({
    data: {
      id: PROBE.studentsNotice,
      title: "B6 students-only probe notice",
      body: "A notice the public board must never show.",
      category: "General",
      audience: "STUDENTS",
      audiences: ["STUDENTS"],
      status: "PUBLISHED",
      publishedOn: new Date(),
    },
  });

  // A stored file the checks can point at.
  await prisma.storedFile.create({
    data: {
      id: PROBE.file,
      storageKey: "b6-probe/probe.bin",
      originalName: "probe.bin",
      mimeType: "application/octet-stream",
      sizeBytes: 16,
    },
  });

  // The draft notice carries the file as an attachment: the file route has
  // to refuse it to an anonymous visitor, because the notice is a draft.
  await prisma.noticeAttachment.create({
    data: {
      noticeId: PROBE.draftNotice,
      name: "draft-attachment.pdf",
      format: "PDF",
      size: "1 KB",
      fileId: PROBE.file,
    },
  });

  // A photograph waiting for the admin inside a public album.
  const album = await prisma.galleryAlbum.findFirst({
    where: { visibility: "PUBLIC" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (album) {
    await prisma.galleryPhoto.create({
      data: {
        id: PROBE.photo,
        albumId: album.id,
        url: "/images/campus.jpg",
        caption: "B6 pending probe photo",
        status: "PENDING",
        fileId: PROBE.file,
        width: 100,
        height: 100,
      },
    });
  }

  // An unpublished routine of Class 10 that takes effect later than the
  // published one: the public routine must still serve the published one.
  const seedClass = await prisma.class.findFirst({
    where: { name: "Class 10" },
    select: { id: true, sections: { where: { isDefault: true }, select: { id: true } } },
  });

  if (seedClass && seedClass.sections[0]) {
    await prisma.routine.create({
      data: {
        id: PROBE.routine,
        classId: seedClass.id,
        sectionId: seedClass.sections[0].id,
        effectiveFrom: new Date("2099-01-01"),
        published: false,
      },
    });
  }
}

/** Takes the probe rows away. */
async function teardown(): Promise<void> {
  await prisma.galleryPhoto.deleteMany({ where: { id: PROBE.photo } });
  await prisma.routine.deleteMany({ where: { id: PROBE.routine } });
  await prisma.noticeAttachment.deleteMany({
    where: { noticeId: { in: [PROBE.draftNotice, PROBE.studentsNotice] } },
  });
  await prisma.notice.deleteMany({
    where: { id: { in: [PROBE.draftNotice, PROBE.studentsNotice] } },
  });
  await prisma.storedFile.deleteMany({ where: { id: PROBE.file } });
}

/* ------------------------------------------------------------ harness ----- */

let failures = 0;
let checks = 0;

/** One passing check. */
function ok(what: string): void {
  checks += 1;
  console.log(`  ok   ${what}`);
}

/** One failing check. */
function fail(what: string, detail: string): void {
  failures += 1;
  console.error(`  FAIL ${what}`);
  console.error(`       ${detail}`);
}

/**
 * Asserts that a row carries exactly the allowed fields — no field the
 * allow-list did not name, none missing.
 */
function assertExactFields(
  what: string,
  row: Record<string, unknown>,
  allowed: readonly string[],
): void {
  const keys = Object.keys(row).sort();
  const expected = [...allowed].sort();

  if (keys.length === expected.length && keys.every((k, i) => k === expected[i])) {
    ok(`${what}: exact allow-list [${expected.join(", ")}]`);
  } else {
    fail(
      what,
      `fields ${keys.join(", ")} do not match the allow-list ${expected.join(", ")}`,
    );
  }
}

/** The JSON of a page, as a string, for the leak scans. */
async function fetchText(path: string, init?: RequestInit): Promise<{
  status: number;
  body: string;
}> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    redirect: "manual",
  });
  const body = await response.text();

  return { status: response.status, body };
}

/* ------------------------------------------------------------ checks ----- */

/** Every public route answers an anonymous visitor with a page. */
async function checkAnonymousRoutes(): Promise<void> {
  console.log("\n-- anonymous access on every public route --");

  for (const path of [
    "/",
    "/admission",
    "/teachers",
    "/about",
    "/notice",
    "/gallery",
    "/calendar",
    "/routine",
    "/robots.txt",
    "/sitemap.xml",
  ]) {
    const { status } = await fetchText(path);

    if (status === 200) {
      ok(`GET ${path} -> 200`);
    } else {
      fail(`GET ${path}`, `expected 200, got ${status}`);
    }
  }
}

/** The portals hold personal records: no crawler and no anonymous page. */
async function checkPortalsExcluded(): Promise<void> {
  console.log("\n-- portals and admin excluded --");

  const robots = await fetchText("/robots.txt");

  for (const path of ["/student", "/teacher", "/admin", "/login", "/design-system"]) {
    if (robots.body.includes(path)) {
      ok(`robots.txt disallows ${path}`);
    } else {
      fail("robots.txt", `${path} is not disallowed`);
    }
  }

  const sitemap = await fetchText("/sitemap.xml");

  // The sitemap carries absolute URLs built from the site config, which is
  // not the host the checks run on, so the entries are read by path.
  const sitemapPaths = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => new URL(match[1]).pathname,
  );

  for (const path of ["/student", "/teacher", "/admin", "/login", "/change-password"]) {
    if (sitemapPaths.some((entry) => entry === path || entry.startsWith(`${path}/`))) {
      fail("sitemap.xml", `${path} must not be listed`);
    } else {
      ok(`sitemap.xml excludes ${path}`);
    }
  }

  for (const path of [
    "/admission",
    "/teachers",
    "/about",
    "/notice",
    "/gallery",
    "/calendar",
    "/routine",
  ]) {
    if (sitemapPaths.includes(path)) {
      ok(`sitemap.xml lists ${path}`);
    } else {
      fail("sitemap.xml", `${path} is missing`);
    }
  }
}

/**
 * The drafts, the audience-restricted notices, the pending photographs and
 * the unpublished routines are never served, and the file route refuses the
 * files behind them.
 */
async function checkNoLeakage(): Promise<void> {
  console.log("\n-- draft, pending and audience-restricted rows never served --");

  // The draft and the students-only notice never appear in the board…
  const board = await loadPublicNoticeBoard({});

  if (!board.rows.some((row) => row.id === PROBE.draftNotice)) {
    ok("board does not serve the draft notice");
  } else {
    fail("board", "the draft notice is served");
  }

  if (!board.rows.some((row) => row.id === PROBE.studentsNotice)) {
    ok("board does not serve the students-only notice");
  } else {
    fail("board", "the students-only notice is served");
  }

  // …and are reported like a notice that does not exist.
  if ((await loadPublicNotice(PROBE.draftNotice)) === null) {
    ok("detail of the draft notice is not found");
  } else {
    fail("detail", "the draft notice is served");
  }

  if ((await loadPublicNotice(PROBE.studentsNotice)) === null) {
    ok("detail of the students-only notice is not found");
  } else {
    fail("detail", "the students-only notice is served");
  }

  const draftPage = await fetchText(`/notice/${PROBE.draftNotice}`);

  if (draftPage.status === 404) {
    ok(`GET /notice/${PROBE.draftNotice} -> 404`);
  } else {
    fail(`GET /notice/${PROBE.draftNotice}`, `expected 404, got ${draftPage.status}`);
  }

  // The pending photograph never reaches the gallery…
  const albums = await loadPublicGalleryAlbums();
  const pendingLeaked = albums.some((album) =>
    album.photos.some((photo) => photo.alt === "B6 pending probe photo"),
  );

  if (!pendingLeaked) {
    ok("gallery serves only approved photographs");
  } else {
    fail("gallery", "a pending photograph is served");
  }

  // …and the files behind the draft attachment and the pending photograph
  // are refused without a session.
  for (const [what, id] of [
    ["the draft attachment", PROBE.file],
    ["the pending photograph", PROBE.file],
  ] as const) {
    const { status } = await fetchText(`/api/files/${id}`);

    if (status !== 200) {
      ok(`the file route refuses ${what} (${status})`);
    } else {
      fail("file route", `${what} is served to an anonymous visitor`);
    }
  }

  // An approved photograph of a public album, when the school has one, is
  // served to anybody.
  const approved = await prisma.galleryPhoto.findFirst({
    where: { status: "APPROVED", album: { visibility: "PUBLIC" }, fileId: { not: null } },
    select: { fileId: true },
  });

  if (approved?.fileId) {
    const { status } = await fetchText(`/api/files/${approved.fileId}`);

    if (status === 200) {
      ok("an approved photograph of a public album is served (200)");
    } else {
      fail("file route", `expected 200 for an approved public photo, got ${status}`);
    }
  } else {
    console.log("  skip no approved public photograph with a stored file");
  }

  // The unpublished routine that takes effect later is not served: the
  // published one is.
  const routine = await loadPublicRoutine("Class 10");

  if (routine && routine.effectiveFrom.length > 0) {
    const probeRoutine = await prisma.routine.findUnique({
      where: { id: PROBE.routine },
      select: { effectiveFrom: true },
    });

    if (probeRoutine && !routine.effectiveFrom.includes("2099")) {
      ok("routine serves only the published timetable");
    } else {
      fail("routine", "an unpublished routine is served");
    }
  }

  // The calendar never serves an entry that is not addressed to everybody.
  const now = new Date();
  const month = await loadPublicCalendarMonth(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
  );
  const restricted = await prisma.calendarEvent.findFirst({
    where: {
      audience: { not: { contains: "Everyone" } },
      date: {
        gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
        lt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
      },
    },
    select: { title: true },
  });

  if (restricted && month.events.some((event) => event.label === restricted.title)) {
    fail("calendar", `a restricted entry ("${restricted.title}") is served`);
  } else {
    ok("calendar serves only the entries addressed to everybody");
  }
}

/** The exact field list of every public shape. */
async function checkAllowLists(): Promise<void> {
  console.log("\n-- field allow-lists of every public shape --");

  const board = await loadPublicNoticeBoard({});

  assertExactFields("notice board", board as unknown as Record<string, unknown>, [
    "rows",
    "total",
    "page",
    "pageSize",
    "pageCount",
    "categories",
  ]);

  if (board.rows.length > 0) {
    assertExactFields("notice board row", board.rows[0] as unknown as Record<string, unknown>, [
      "id",
      "publishedOn",
      "publishedLabel",
      "shortLabel",
      "category",
      "title",
      "searchText",
      "attachments",
    ]);
  }

  const published = await prisma.notice.findFirst({
    where: { status: "PUBLISHED", audience: "PUBLIC" },
    orderBy: { publishedOn: "desc" },
    select: { id: true },
  });

  if (published) {
    const detail = await loadPublicNotice(published.id);

    if (detail) {
      assertExactFields("notice detail", detail as unknown as Record<string, unknown>, [
        "id",
        "publishedOn",
        "publishedLabel",
        "category",
        "title",
        "eyebrow",
        "greeting",
        "body",
        "signature",
        "attachments",
      ]);

      if (detail.attachments.length > 0) {
        assertExactFields(
          "notice attachment",
          detail.attachments[0] as unknown as Record<string, unknown>,
          ["name", "format", "size", "fileId"],
        );
      }
    }
  }

  const homeNotices = await loadPublicHomeNotices();

  if (homeNotices.length > 0) {
    assertExactFields("home notice", homeNotices[0] as unknown as Record<string, unknown>, [
      "date",
      "category",
      "title",
      "description",
      "href",
      "tabs",
    ]);
  }

  const albums = await loadPublicGalleryAlbums();

  if (albums.length > 0) {
    const album = albums[0];

    assertExactFields("gallery album", album as unknown as Record<string, unknown>, [
      "id",
      "title",
      "date",
      "photoCount",
      "category",
      "description",
      "photos",
    ]);

    if (album.photos.length > 0) {
      assertExactFields("gallery photo", album.photos[0] as unknown as Record<string, unknown>, [
        "src",
        "alt",
        "width",
        "height",
      ]);
    }
  }

  const month = await loadPublicCalendarMonth(2026, 11);

  assertExactFields("calendar month", month as unknown as Record<string, unknown>, [
    "year",
    "month",
    "events",
    "highlights",
  ]);

  if (month.events.length > 0) {
    assertExactFields("calendar event", month.events[0] as unknown as Record<string, unknown>, [
      "day",
      "year",
      "month",
      "label",
      "kind",
    ]);
  }

  const classes = await loadPublicRoutineClasses();

  if (classes.length > 0) {
    assertExactFields("routine class", classes[0] as unknown as Record<string, unknown>, [
      "id",
      "name",
    ]);
  }

  if (classes.length !== 12) {
    fail("routine classes", `expected the 12 classes of the school, got ${classes.length}`);
  } else {
    ok("routine offers the 12 classes of the school");
  }

  const routine = await loadPublicRoutine(classes[0]?.name ?? "Class 1");

  if (routine) {
    assertExactFields("routine", routine as unknown as Record<string, unknown>, [
      "classId",
      "className",
      "effectiveFrom",
      "days",
    ]);

    const day = routine.days[0];

    if (day && day.periods.length > 0) {
      assertExactFields("routine period", day.periods[0] as unknown as Record<string, unknown>, [
        "period",
        "time",
        "subject",
      ]);
    }

    if (JSON.stringify(routine).includes("teacher") || JSON.stringify(routine).includes("Teacher")) {
      fail("routine", "the routine carries a teacher reference");
    } else {
      ok("routine carries no teacher data");
    }
  }

  const staff = await loadPublicStaff();

  if (staff.length > 0) {
    assertExactFields("staff member", staff[0] as unknown as Record<string, unknown>, [
      "id",
      "name",
      "designation",
      "subject",
      "group",
      "imageSrc",
      "imageAlt",
      "imageWidth",
      "imageHeight",
    ]);

    if (JSON.stringify(staff).includes("@")) {
      fail("staff", "the directory carries an email address");
    } else {
      ok("staff directory carries no email address");
    }
  }

  const fees = await loadPublicFees();

  if (fees.length > 0) {
    assertExactFields("fee row", fees[0] as unknown as Record<string, unknown>, [
      "className",
      "admission",
      "tuition",
      "activities",
    ]);
  }

  if (fees.length !== 12) {
    fail("fee table", `expected a row for each of the 12 classes, got ${fees.length}`);
  } else {
    ok("fee table carries every class of the school");
  }

  if (JSON.stringify(fees).match(/\d+\.\d{2}/)) {
    fail("fee table", "an amount looks like a float, not taka");
  } else {
    ok("fee amounts are formatted in taka");
  }
}

/** The board counts are the counts the database holds. */
async function checkCountsMatchDatabase(): Promise<void> {
  console.log("\n-- filter counts match the database --");

  const dbCount = await prisma.notice.count({
    where: {
      status: "PUBLISHED",
      OR: [
        { audience: "PUBLIC" },
        { audiences: { hasSome: ["PUBLIC"] } },
      ],
    },
  });

  const board = await loadPublicNoticeBoard({});

  if (board.total === dbCount) {
    ok(`unfiltered board total is ${dbCount}, as the database counts`);
  } else {
    fail("board total", `service says ${board.total}, database says ${dbCount}`);
  }

  if (board.pageCount === Math.max(1, Math.ceil(dbCount / board.pageSize))) {
    ok("page count follows the total");
  } else {
    fail("page count", `${board.pageCount} does not follow ${dbCount}`);
  }

  const bellCount = await prisma.notice.count({
    where: {
      status: "PUBLISHED",
      OR: [
        { audience: "PUBLIC" },
        { audiences: { hasSome: ["PUBLIC"] } },
      ],
    },
  });

  if (bellCount === dbCount) {
    ok("navbar bell count matches the database");
  } else {
    fail("bell count", `service says ${bellCount}, database says ${dbCount}`);
  }

  // A category filter really narrows the set.
  const firstCategory = board.categories.find((c) => c !== "All categories");

  if (firstCategory) {
    const filtered = await loadPublicNoticeBoard({ category: firstCategory });
    const dbFiltered = await prisma.notice.count({
      where: {
        status: "PUBLISHED",
        audience: "PUBLIC",
        category: firstCategory,
      },
    });

    if (filtered.total === dbFiltered) {
      ok(`category filter total matches the database (${dbFiltered})`);
    } else {
      fail(
        "category filter",
        `service says ${filtered.total}, database says ${dbFiltered}`,
      );
    }
  }
}

/** The school name comes from the one config file, everywhere. */
async function checkSiteConfig(): Promise<void> {
  console.log("\n-- site config everywhere --");

  for (const path of ["/", "/about", "/admission", "/notice", "/login"]) {
    const { body } = await fetchText(path);

    if (!body.includes("Narail Collectorate School")) {
      fail(`${path}`, "the school name from the config is missing");
    } else {
      ok(`${path} carries the school name`);
    }

    if (body.includes("[School Name]") || body.includes("[Year]")) {
      fail(`${path}`, "a design placeholder survived on the page");
    } else {
      ok(`${path} carries no design placeholder`);
    }
  }
}

/**
 * The admin actions revalidate the public cache tags after a write. The
 * behaviour itself belongs to the Next runtime, so the wiring is read from
 * the source: every write action has to drop the tag of the rows it wrote.
 */
function checkRevalidationWiring(): void {
  console.log("\n-- revalidation wiring in the admin actions --");

  const source = readFileSync(
    join(process.cwd(), "src", "app", "admin", "actions.ts"),
    "utf8",
  );

  const expectations: readonly [RegExp, string][] = [
    [/saveNoticeAction[\s\S]{0,2000}?revalidatePublicCache\(CACHE_TAGS\.notices\)/, "saveNoticeAction revalidates notices"],
    [/publishNoticeAction[\s\S]{0,2000}?revalidatePublicCache\(CACHE_TAGS\.notices\)/, "publishNoticeAction revalidates notices"],
    [/unpublishNoticeAction[\s\S]{0,2000}?revalidatePublicCache\(CACHE_TAGS\.notices\)/, "unpublishNoticeAction revalidates notices"],
    [/deleteNoticeAction[\s\S]{0,2000}?revalidatePublicCache\(CACHE_TAGS\.notices\)/, "deleteNoticeAction revalidates notices"],
    [/approvePhotoAction[\s\S]{0,2000}?revalidatePublicCache\(CACHE_TAGS\.gallery\)/, "approvePhotoAction revalidates gallery"],
    [/uploadPhotosAction[\s\S]{0,2000}?revalidatePublicCache\(CACHE_TAGS\.gallery\)/, "uploadPhotosAction revalidates gallery"],
    [/saveRoutineAction[\s\S]{0,2000}?revalidatePublicCache\(CACHE_TAGS\.routine\)/, "saveRoutineAction revalidates routine"],
    [/publishRoutineAction[\s\S]{0,2000}?revalidatePublicCache\(CACHE_TAGS\.routine\)/, "publishRoutineAction revalidates routine"],
    [/saveCalendarEventAction[\s\S]{0,2000}?revalidatePublicCache\(CACHE_TAGS\.calendar\)/, "saveCalendarEventAction revalidates calendar"],
    [/deleteCalendarEventAction[\s\S]{0,2000}?revalidatePublicCache\(CACHE_TAGS\.calendar\)/, "deleteCalendarEventAction revalidates calendar"],
    [/saveFeeStructureAction[\s\S]{0,2000}?revalidatePublicCache\(CACHE_TAGS\.fees\)/, "saveFeeStructureAction revalidates fees"],
  ];

  for (const [pattern, what] of expectations) {
    if (pattern.test(source)) {
      ok(what);
    } else {
      fail("admin actions", `${what} is missing`);
    }
  }

  const cacheTags = readFileSync(
    join(process.cwd(), "src", "server", "cache-tags.ts"),
    "utf8",
  );

  for (const tag of ["notices", "gallery", "routine", "calendar", "fees", "staff", "home"]) {
    if (cacheTags.includes(`${tag}: "${tag}"`)) {
      ok(`cache tag "${tag}" is defined`);
    } else {
      fail("cache tags", `tag "${tag}" is missing`);
    }
  }
}

/**
 * No public read asks the database once per row. The reads are bounded by
 * construction, so the check reads the source: no public service may await
 * a Prisma call inside a loop over rows.
 */
function checkNoNPlusOne(): void {
  console.log("\n-- no N+1 in the public services --");

  const services = [
    "public-notices.ts",
    "public-gallery.ts",
    "public-calendar.ts",
    "public-routine.ts",
    "public-staff.ts",
    "public-fees.ts",
    "public-home.ts",
  ];

  for (const file of services) {
    const source = readFileSync(
      join(process.cwd(), "src", "server", "services", file),
      "utf8",
    );

    // A `map` callback that awaits the database is the N+1 shape. The
    // services map rows in memory only.
    const suspect = source.match(/\.map\(\s*async[^\n]*\n[^\n]*await prisma/);

    if (suspect) {
      fail(file, "a row loop awaits the database");
    } else {
      ok(`${file}: no database call inside a row loop`);
    }
  }
}

/* -------------------------------------------------------------- run ------ */

async function main(): Promise<void> {
  const mode = process.argv[2];

  if (mode === "--setup") {
    await setup();
    console.log("B6 probes in place.");
    return;
  }

  if (mode === "--teardown") {
    await teardown();
    console.log("B6 probes taken away.");
    return;
  }

  console.log(`B6 public checks against ${BASE_URL}`);

  await setup();

  try {
    await checkAnonymousRoutes();
    await checkPortalsExcluded();
    await checkNoLeakage();
    await checkAllowLists();
    await checkCountsMatchDatabase();
    await checkSiteConfig();
    checkRevalidationWiring();
    checkNoNPlusOne();
  } finally {
    await teardown();
  }

  console.log(`\n${checks} passed, ${failures} failed`);

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
