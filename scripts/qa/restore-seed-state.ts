import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { deleteFile } from "@/server/storage";

/**
 * Puts the database back the way the seed describes it.
 *
 * The browser checks write rows of their own and change some of the seeded
 * rows, so this clears what they left behind and restores the rows they
 * changed. It is safe to run at any time: every row it touches is one a
 * check wrote or one a check changed.
 *
 * Usage: npx tsx scripts/qa/restore-seed-state.ts
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  // The albums a check created carry the name the check gave them.
  const created = await prisma.galleryAlbum.findMany({
    where: { title: { startsWith: "New album" } },
    select: { id: true },
  });

  await prisma.galleryAlbum.deleteMany({
    where: { id: { in: created.map((album) => album.id) } },
  });

  // The photographs a check uploaded are removed, and the ones a check
  // approved go back to the queue.
  const photos = await prisma.galleryPhoto.findMany({
    where: {
      OR: [
        { name: { startsWith: "b3b-check" } },
        { url: { startsWith: "/api/files/" } },
      ],
    },
    select: { id: true },
  });

  await prisma.galleryPhoto.deleteMany({
    where: { id: { in: photos.map((photo) => photo.id) } },
  });

  await prisma.galleryPhoto.updateMany({
    where: { id: { in: ["photo-upload-1", "photo-upload-2"] } },
    data: { status: "PENDING", reviewedById: null, reviewedAt: null },
  });

  // The draft a check published goes back to being a draft.
  await prisma.notice.updateMany({
    where: { id: "notice-notice-department-meeting" },
    data: { status: "DRAFT" },
  });

  // The attachments and the files a check wrote are removed, so the storage
  // does not keep files nobody can reach.
  const attachments = await prisma.noticeAttachment.findMany({
    where: { fileId: { not: null } },
    select: { id: true },
  });

  await prisma.noticeAttachment.deleteMany({
    where: { id: { in: attachments.map((attachment) => attachment.id) } },
  });

  const files = await prisma.storedFile.findMany({
    select: { id: true, storageKey: true },
  });

  for (const file of files) {
    await deleteFile(file.storageKey);
  }

  await prisma.storedFile.deleteMany({});

  await prisma.notice.deleteMany({
    where: { title: { startsWith: "B3B check" } },
  });

  await prisma.calendarEvent.deleteMany({
    where: { title: { startsWith: "B3B check" } },
  });

  // The routines a check wrote are written for a date of their own.
  await prisma.routine.deleteMany({
    where: { effectiveFrom: { gt: new Date("2026-11-30T00:00:00.000Z") } },
  });

  // The audit rows a check wrote are removed; the seeded ones are kept.
  await prisma.auditLog.deleteMany({
    where: { NOT: { id: { startsWith: "audit-" } } },
  });

  console.log(
    `Restored: removed ${created.length} album(s), ${photos.length} photo(s), ${attachments.length} attachment(s) and ${files.length} file(s).`,
  );

  await prisma.$disconnect();
}

void main();
