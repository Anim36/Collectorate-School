import "dotenv/config";

import bcrypt from "bcryptjs";

import { prisma } from "@/server/db";
import { deleteFile } from "@/server/storage";
import { deleteQaAuditRows } from "./audit-cleanup";
import {
  attachFiles,
  listNotices,
  removeAttachment,
  saveNotice,
} from "@/server/services/notices";
import {
  listAlbums,
  listPendingPhotos,
  uploadPhotos,
} from "@/server/services/gallery";
import {
  getRoutine,
  listRoutineClasses,
  publishRoutine,
  saveRoutine,
} from "@/server/services/routine";
import {
  deleteCalendarEvent,
  listCalendarEvents,
  saveCalendarEvent,
} from "@/server/services/calendar";

/**
 * The checks of step B3B.
 *
 * They run against the real database and clean up after themselves, so they
 * can be run again without changing the school.
 *
 * Usage: npx tsx scripts/qa/check-admin-11b.ts
 */

/** The prefix every row the checks write carries, so it can be removed. */
const PREFIX = "b3b-check";

/** The account the checks act as. It is thrown away afterwards. */
const ACTOR_ID = `${PREFIX}-admin`;

/**
 * The date the routine of the checks takes effect from.
 *
 * The date is far in the future, so the routine the school runs now is never
 * the one the checks touch, and the cleanup can find the routine of the
 * checks by its date alone.
 */
const EFFECTIVE_FROM = "2099-12-01";

const results: { name: string; pass: boolean; detail: string }[] = [];

function check(name: string, pass: boolean, detail = ""): void {
  results.push({ name, pass, detail });
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`,
  );
}

/** A one-pixel PNG, used as the bytes of an uploaded file. */
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * Creates the account the checks act as.
 *
 * The checks write their own throwaway admin rather than borrowing the
 * seeded one, so every audit row they leave behind belongs to them and can
 * be removed again.
 */
async function createActor(): Promise<string> {
  const passwordHash = await bcrypt.hash("B3B-Check-Pass-2026!", 12);

  await prisma.user.upsert({
    where: { loginIdNormalized: ACTOR_ID },
    update: { passwordHash, role: "ADMIN" },
    create: {
      id: ACTOR_ID,
      loginId: ACTOR_ID,
      loginIdNormalized: ACTOR_ID,
      name: "B3B Check",
      passwordHash,
      role: "ADMIN",
      isActive: true,
      mustChangePassword: false,
    },
  });

  return ACTOR_ID;
}

/** Removes every row the checks wrote. */
async function cleanup(): Promise<void> {
  // The audit rows of the checks belong to their own account.
  await deleteQaAuditRows(prisma, { actorIds: [ACTOR_ID] });

  // The audit rows of an earlier run of the checks name the rows of that run,
  // so they are found by their entity id as well.
  await deleteQaAuditRows(prisma, { entityPrefix: PREFIX });

  // An audit row about a file names the file, so it is found by the name it
  // carries. Prisma selects the rows; the cleanup function deletes them.
  const fileRows = await prisma.auditLog.findMany({
    where: { metadata: { path: ["name"], string_contains: PREFIX } },
    select: { id: true },
  });

  await deleteQaAuditRows(prisma, {
    rowIds: fileRows.map((row) => row.id),
  });

  // An audit row about a batch of files carries the names of the files.
  const batchRows = await prisma.auditLog.findMany({
    where: { metadata: { path: ["names", "0"], string_contains: PREFIX } },
    select: { id: true },
  });

  await deleteQaAuditRows(prisma, {
    rowIds: batchRows.map((row) => row.id),
  });

  // The photographs the checks uploaded are named after the prefix, so they
  // are found by their name rather than by their id.
  const photos = await prisma.galleryPhoto.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true, albumId: true },
  });

  await prisma.galleryPhoto.deleteMany({
    where: { id: { in: photos.map((photo) => photo.id) } },
  });

  // The album keeps the number of photographs it holds on its own column, so
  // the count the checks added is taken off again.
  const albumCounts = new Map<string, number>();

  for (const photo of photos) {
    albumCounts.set(photo.albumId, (albumCounts.get(photo.albumId) ?? 0) + 1);
  }

  for (const [albumId, count] of albumCounts) {
    await prisma.galleryAlbum.update({
      where: { id: albumId },
      data: { photoCount: { decrement: count } },
    });
  }

  // The files the checks uploaded are removed from the disk as well, so the
  // storage does not keep files nobody can reach.
  const files = await prisma.storedFile.findMany({
    where: { uploadedById: ACTOR_ID },
    select: { id: true, storageKey: true },
  });

  for (const file of files) {
    await deleteFile(file.storageKey);
  }

  await prisma.storedFile.deleteMany({
    where: { id: { in: files.map((file) => file.id) } },
  });

  const notices = await prisma.notice.findMany({
    where: { id: { startsWith: PREFIX } },
    select: { id: true },
  });

  for (const notice of notices) {
    await prisma.noticeAttachment.deleteMany({
      where: { noticeId: notice.id },
    });
  }

  await prisma.notice.deleteMany({ where: { id: { startsWith: PREFIX } } });

  await prisma.calendarEvent.deleteMany({
    where: { id: { startsWith: PREFIX } },
  });

  // The routine of the checks is written for a date of its own, so the
  // routines the school runs are left alone.
  await prisma.routine.deleteMany({
    where: { effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`) },
  });

  await prisma.user.deleteMany({ where: { id: ACTOR_ID } });

  console.log(
    `Cleanup: removed ${notices.length} notice(s), ${photos.length} photo(s), ${files.length} file(s).`,
  );
}

async function main(): Promise<void> {
  const actorId = await createActor();

  /* ------------------------------------------------------------- notices --- */

  const created = await saveNotice(actorId, {
    id: `${PREFIX}-notice`,
    title: "B3B check notice",
    body: "<p>The body of the check notice.</p>",
    category: "Academic",
    audiences: ["PUBLIC", "STUDENTS"],
    publishedOn: "2026-11-04",
  });

  check(
    "notice is saved on the database",
    created.ok,
    created.ok ? created.data.id : created.error,
  );

  const listed = await listNotices({ query: "B3B check", page: 0, pageSize: 10 });

  check(
    "notice is found by the search",
    listed.ok && listed.data.rows.length === 1,
    listed.ok ? `${listed.data.total} match(es)` : listed.error,
  );

  const drafts = await listNotices({ status: "DRAFT", page: 0, pageSize: 100 });

  check(
    "notice list filters by status",
    drafts.ok && drafts.data.rows.every((row) => row.status === "Draft"),
    drafts.ok ? `${drafts.data.total} draft(s)` : drafts.error,
  );

  // A notice that is saved without a body is refused.
  const emptyBody = await saveNotice(actorId, {
    id: `${PREFIX}-empty`,
    title: "B3B check empty",
    body: "<p></p>",
    category: "Academic",
    audiences: ["PUBLIC"],
  });

  check(
    "a notice without a body is refused",
    !emptyBody.ok,
    emptyBody.ok ? "it was accepted" : emptyBody.error,
  );

  // A notice with a title that is too short is refused.
  const shortTitle = await saveNotice(actorId, {
    id: `${PREFIX}-short`,
    title: "x",
    body: "<p>Body.</p>",
    category: "Academic",
    audiences: ["PUBLIC"],
  });

  check(
    "a notice with a short title is refused",
    !shortTitle.ok,
    shortTitle.ok ? "it was accepted" : shortTitle.error,
  );

  /* ---------------------------------------------------------- attachments --- */

  const attached = await attachFiles(actorId, {
    noticeId: `${PREFIX}-notice`,
    files: [
      { name: `${PREFIX}-photo.png`, base64: PNG_BYTES.toString("base64") },
    ],
  });

  check(
    "a file is attached to a notice",
    attached.ok && attached.data.attached === 1,
    attached.ok ? `${attached.data.attached} attached` : attached.error,
  );

  const withAttachment = await listNotices({
    query: "B3B check",
    page: 0,
    pageSize: 10,
  });

  const attachmentRows =
    withAttachment.ok && withAttachment.data.rows.length > 0
      ? withAttachment.data.rows[0].attachments
      : [];

  check(
    "the attachment is on the notice row",
    attachmentRows.length === 1 && attachmentRows[0].fileId !== null,
    `${attachmentRows.length} attachment(s)`,
  );

  // A file that is not a picture is refused.
  const badFile = await attachFiles(actorId, {
    noticeId: `${PREFIX}-notice`,
    files: [
      {
        name: `${PREFIX}-bad.txt`,
        base64: Buffer.from("hello").toString("base64"),
      },
    ],
  });

  check(
    "a file that is not a picture is refused",
    !badFile.ok,
    badFile.ok ? "it was accepted" : badFile.error,
  );

  // A file without any bytes is refused as empty, before its type is looked
  // at, and nothing is written for it.
  const emptyFile = await attachFiles(actorId, {
    noticeId: `${PREFIX}-notice`,
    files: [{ name: `${PREFIX}-empty.png`, base64: "" }],
  });

  check(
    "a file without bytes is refused as empty",
    !emptyFile.ok && emptyFile.reason === "EMPTY",
    emptyFile.ok ? "it was accepted" : emptyFile.reason ?? emptyFile.error,
  );

  const emptyAttachment = await prisma.noticeAttachment.count({
    where: { noticeId: `${PREFIX}-notice`, name: `${PREFIX}-empty.png` },
  });

  check(
    "a refused empty file leaves no attachment behind",
    emptyAttachment === 0,
    `${emptyAttachment} attachment(s)`,
  );

  const audit = await prisma.auditLog.findFirst({
    where: { actorId: ACTOR_ID, action: "Files attached to notice" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  check("attaching a file writes an audit row", audit !== null);

  if (attachmentRows.length > 0) {
    const removed = await removeAttachment(actorId, attachmentRows[0].id);

    check(
      "an attachment is removed",
      removed.ok,
      removed.ok ? removed.data.id : removed.error,
    );
  }

  /* ------------------------------------------------------------- gallery --- */

  const albums = await listAlbums({});

  check(
    "the albums are read from the database",
    albums.ok && albums.data.rows.length > 0,
    albums.ok ? `${albums.data.total} album(s)` : albums.error,
  );

  const album =
    albums.ok && albums.data.rows.length > 0 ? albums.data.rows[0] : null;

  if (album) {
    const uploaded = await uploadPhotos(actorId, {
      albumId: album.id,
      files: [
        { name: `${PREFIX}-photo.png`, base64: PNG_BYTES.toString("base64") },
      ],
    });

    check(
      "a photo is uploaded into an album",
      uploaded.ok && uploaded.data.uploaded === 1,
      uploaded.ok ? `${uploaded.data.uploaded} uploaded` : uploaded.error,
    );

    const pending = await listPendingPhotos();

    check(
      "the approval queue is read from the database",
      pending.ok,
      pending.ok ? `${pending.data.length} waiting` : pending.error,
    );
  }

  /* ------------------------------------------------------------- routine --- */

  const classes = await listRoutineClasses();

  check(
    "the routine classes are read from the database",
    classes.ok && classes.data.length === 12,
    classes.ok ? `${classes.data.length} class(es)` : classes.error,
  );

  const classNames = classes.ok ? classes.data.map((entry) => entry.name) : [];

  check(
    "no class carries a section",
    classNames.every((name) => !/section/i.test(name)),
    classNames.join(", "),
  );

  const routineClass = classes.ok ? classes.data[0] : null;

  if (routineClass) {
    const routine = await getRoutine(routineClass.id);

    check(
      "the routine of a class is read from the database",
      routine.ok,
      routine.ok ? `${routine.data.cells.length} period(s)` : routine.error,
    );

    // The subject of the period has to be one the class teaches, so the
    // subject is taken from the allocations of the class itself.
    const subject = routineClass.subjects[0];

    if (!subject) {
      check(
        "a routine is saved with the periods it holds",
        false,
        "the class teaches no subject",
      );
    } else {
      const saved = await saveRoutine(actorId, {
        classId: routineClass.id,
        effectiveFrom: EFFECTIVE_FROM,
        periods: [{ day: 0, period: 1, subjectId: subject.id }],
      });

      const written = await prisma.routinePeriod.findMany({
        where: {
          routine: {
            classId: routineClass.id,
            effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
          },
        },
        select: { day: true, period: true, subjectId: true },
      });

      check(
        "a routine is saved with the periods it holds",
        saved.ok && written.length === 1 && written[0].subjectId === subject.id,
        saved.ok ? `${written.length} period(s) written` : saved.error,
      );
    }

    // A subject that the class does not teach is refused.
    const foreignSubject = classes.ok
      ? classes.data
          .flatMap((entry) => entry.subjects)
          .find(
            (entry) => !routineClass.subjects.some((own) => own.id === entry.id),
          )
      : undefined;

    if (foreignSubject) {
      const refused = await saveRoutine(actorId, {
        classId: routineClass.id,
        effectiveFrom: EFFECTIVE_FROM,
        periods: [{ day: 0, period: 2, subjectId: foreignSubject.id }],
      });

      check(
        "a subject the class does not teach is refused",
        !refused.ok,
        refused.ok ? "it was accepted" : refused.error,
      );
    }

    // A teacher who is already booked in another class cannot be booked
    // again, so the booking of another class is looked up first.
    const otherClass = classes.ok ? classes.data[1] : undefined;

    const booked = otherClass
      ? await prisma.routinePeriod.findFirst({
          where: {
            teacherId: { not: null },
            routine: { classId: { not: otherClass.id } },
          },
          select: { day: true, period: true, teacherId: true },
        })
      : null;

    const otherSubject = otherClass?.subjects[0];

    if (otherClass && otherSubject && booked && booked.teacherId) {
      const clash = await saveRoutine(actorId, {
        classId: otherClass.id,
        effectiveFrom: EFFECTIVE_FROM,
        periods: [
          {
            day: booked.day,
            period: booked.period,
            subjectId: otherSubject.id,
            teacherId: booked.teacherId,
          },
        ],
      });

      check(
        "a teacher who is booked in another class is refused",
        !clash.ok,
        clash.ok ? "it was accepted" : clash.error,
      );
    }

    const published = await publishRoutine(actorId, routineClass.id);

    check(
      "a routine is published",
      published.ok,
      published.ok ? published.data.id : published.error,
    );
  }

  /* ------------------------------------------------------------ calendar --- */

  const events = await listCalendarEvents({ page: 0, pageSize: 20 });

  check(
    "the calendar events are read from the database",
    events.ok && events.data.total > 0,
    events.ok ? `${events.data.total} event(s)` : events.error,
  );

  const event = await saveCalendarEvent(actorId, {
    id: `${PREFIX}-event`,
    title: "B3B check event",
    date: "2026-11-20",
    endDate: "2026-11-21",
    type: "EVENT",
    audience: "Everyone",
  });

  check(
    "a calendar event is saved",
    event.ok,
    event.ok ? event.data.id : event.error,
  );

  const endBeforeStart = await saveCalendarEvent(actorId, {
    id: `${PREFIX}-event`,
    title: "B3B check event",
    date: "2026-11-21",
    endDate: "2026-11-20",
    type: "EVENT",
  });

  check(
    "an event that ends before it starts is refused",
    !endBeforeStart.ok,
    endBeforeStart.ok ? "it was accepted" : endBeforeStart.error,
  );

  const removedEvent = await deleteCalendarEvent(actorId, `${PREFIX}-event`);

  check(
    "a calendar event is removed",
    removedEvent.ok,
    removedEvent.ok ? removedEvent.data.id : removedEvent.error,
  );

  /* ------------------------------------------------------------- cleanup --- */

  await cleanup();

  const failed = results.filter((result) => !result.pass);

  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed.`,
  );

  if (failed.length > 0) process.exit(1);
}

main()
  .catch(async (error) => {
    console.error(error);
    await cleanup().catch(() => undefined);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
