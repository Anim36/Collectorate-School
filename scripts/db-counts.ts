import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Prints the row counts of every seeded table, so the seed can be checked
 * after it runs. Run it with:
 *
 *   npx tsx scripts/db-counts.ts
 */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const usersByRole = await prisma.user.groupBy({
    by: ["role"],
    _count: { _all: true },
  });

  const studentsPerClass = await prisma.student.groupBy({
    by: ["classId"],
    _count: { _all: true },
    orderBy: { classId: "asc" },
  });

  const classNames = new Map(
    (await prisma.class.findMany({ orderBy: { sortOrder: "asc" } })).map(
      (row) => [row.id, row.name],
    ),
  );

  const counts = {
    users: await prisma.user.count(),
    usersByRole: Object.fromEntries(
      usersByRole.map((row) => [row.role, row._count._all]),
    ),
    classes: await prisma.class.count(),
    sections: await prisma.section.count(),
    defaultSections: await prisma.section.count({ where: { isDefault: true } }),
    subjects: await prisma.subject.count(),
    classSubjects: await prisma.classSubject.count(),
    students: await prisma.student.count(),
    studentsPerClass: Object.fromEntries(
      studentsPerClass.map((row) => [
        classNames.get(row.classId) ?? row.classId,
        row._count._all,
      ]),
    ),
    teachers: await prisma.teacher.count(),
    staff: await prisma.staff.count(),
    academicYears: await prisma.academicYear.count(),
    attendance: await prisma.attendance.count(),
    attendanceSheets: await prisma.attendanceSheet.count(),
    exams: await prisma.exam.count(),
    resultSheets: await prisma.resultSheet.count(),
    examResults: await prisma.examResult.count(),
    feeStructures: await prisma.feeStructure.count(),
    fees: await prisma.fee.count(),
    feesByStatus: await prisma.fee.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    payments: await prisma.payment.count(),
    receipts: await prisma.receipt.count(),
    notices: await prisma.notice.count(),
    noticeAttachments: await prisma.noticeAttachment.count(),
    galleryAlbums: await prisma.galleryAlbum.count(),
    galleryPhotos: await prisma.galleryPhoto.count(),
    routines: await prisma.routine.count(),
    routinePeriods: await prisma.routinePeriod.count(),
    calendarEvents: await prisma.calendarEvent.count(),
    auditLogs: await prisma.auditLog.count(),
    navigationItems: await prisma.navigationItem.count(),
    portalNavItems: await prisma.portalNavItem.count(),
    admissionSteps: await prisma.admissionStep.count(),
    quickLinks: await prisma.quickLink.count(),
    schoolStats: await prisma.schoolStat.count(),
  };

  console.log(JSON.stringify(counts, null, 2));

  await prisma.$disconnect();
}

void main();
