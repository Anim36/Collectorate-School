import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { deleteFile } from "@/server/storage";
import { SEED_DEMO_DATA } from "../../prisma/seed-data/demo";
import { poisha } from "../../prisma/seed-data/helpers";

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

  // The payments a check recorded are taken off again, and the fee lines they
  // settled are put back to due. A check that paid a line by hand must not
  // leave the school with a paid fee the seed does not describe.
  //
  // Two kinds of payment are found: the ones a check made with a transaction
  // id of its own, and the ones the server issued a receipt for. The seed
  // writes its receipts as "RCP-2026-4471", so a receipt that starts with
  // "RCPT-" is one the server handed out during a check.
  const checkPayments = await prisma.payment.findMany({
    where: {
      OR: [
        { transactionId: { startsWith: "b3c-check-" } },
        { receipt: { receiptNo: { startsWith: "RCPT-" } } },
      ],
    },
    select: { id: true },
  });

  const checkPaymentIds = checkPayments.map((payment) => payment.id);

  const settledFees = await prisma.paymentItem.findMany({
    where: { paymentId: { in: checkPaymentIds } },
    select: { feeId: true },
  });

  await prisma.paymentItem.deleteMany({
    where: { paymentId: { in: checkPaymentIds } },
  });

  await prisma.receipt.deleteMany({
    where: { paymentId: { in: checkPaymentIds } },
  });

  await prisma.payment.deleteMany({
    where: { id: { in: checkPaymentIds } },
  });

  await prisma.fee.updateMany({
    where: { id: { in: settledFees.map((item) => item.feeId) } },
    data: { status: "DUE", paidAt: null },
  });

  // The fee structure a check edited is put back the way the seed describes
  // it. The seed writes the amounts of the mock fee structure table, so the
  // structure is written from the same source the seed uses.
  const structures = await prisma.feeStructure.findMany({
    where: { academicYearId: "academic-year-2026" },
    select: { id: true, class: { select: { sortOrder: true } } },
  });

  for (const structure of structures) {
    const band =
      structure.class.sortOrder >= 10
        ? SEED_DEMO_DATA.adminFeeStructure.find(
            (row) => row.classBand === "9–10",
          )
        : SEED_DEMO_DATA.adminFeeStructure.find(
            (row) => row.classBand === "6–8",
          );

    if (!band) continue;

    await prisma.feeStructure.update({
      where: { id: structure.id },
      data: {
        monthlyTuitionPoisha: poisha(band.monthlyTuition),
        admissionFeePoisha: poisha(band.admissionFee),
        activitiesPoisha: poisha(band.activities),
      },
    });
  }

  console.log(
    `Restored: removed ${created.length} album(s), ${photos.length} photo(s), ${attachments.length} attachment(s), ${files.length} file(s) and ${checkPayments.length} payment(s).`,
  );

  await prisma.$disconnect();
}

void main();
