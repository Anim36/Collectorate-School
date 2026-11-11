import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Puts a QA student with a real record in place.
 *
 * The student pages read the database, so the check needs a student that
 * really has attendance, results, fees and a receipt. The account is a
 * throwaway: it is removed again when the check is over.
 */

const PASSWORD = "B5-Student-Pass-2026!";
const LOGIN_ID = "b5-check-student";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export async function createCheckStudent(): Promise<string> {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // A student of Class 9, because the seed writes attendance, results and
  // fees for that class.
  const demo = await prisma.student.findFirst({
    where: { class: { name: "Class 9" } },
    orderBy: { roll: "asc" },
    select: { id: true, classId: true, sectionId: true, academicYearId: true, roll: true },
  });

  if (!demo) throw new Error("no Class 9 student to copy");

  const user = await prisma.user.upsert({
    where: { loginIdNormalized: LOGIN_ID },
    update: {
      passwordHash,
      role: "STUDENT",
      isActive: true,
      mustChangePassword: false,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      id: `user-${LOGIN_ID}`,
      loginId: LOGIN_ID,
      loginIdNormalized: LOGIN_ID,
      name: "B5 Check Student",
      email: `${LOGIN_ID}@example.com`,
      passwordHash,
      role: "STUDENT",
      classOrDepartment: "Class 9",
      isActive: true,
      mustChangePassword: false,
    },
  });

  const student = await prisma.student.upsert({
    where: { userId: user.id },
    update: { lastVisitedAt: null },
    create: {
      id: `student-${LOGIN_ID}`,
      userId: user.id,
      studentId: "ST-B5-0001",
      name: "B5 Check Student",
      classId: demo.classId,
      sectionId: demo.sectionId,
      academicYearId: demo.academicYearId,
      roll: 999,
      guardianName: "Guardian",
      guardianPhone: "01700000000",
      phone: "01700000000",
      emergencyContact: "01800000000",
      email: `${LOGIN_ID}@example.com`,
      address: "Narail",
    },
  });

  // The attendance of the demo student, so the calendar has days to show.
  const demoStudent = await prisma.student.findFirst({
    where: { class: { name: "Class 9" } },
    orderBy: { roll: "asc" },
    select: { id: true },
  });

  if (demoStudent) {
    const rows = await prisma.attendance.findMany({
      where: { studentId: demoStudent.id },
      select: { date: true, status: true, sectionId: true },
    });

    for (const row of rows) {
      await prisma.attendance.upsert({
        where: { studentId_date: { studentId: student.id, date: row.date } },
        update: { status: row.status },
        create: {
          studentId: student.id,
          sectionId: row.sectionId,
          date: row.date,
          status: row.status,
        },
      });
    }
  }

  // The published results of the demo student.
  const demoResults = await prisma.examResult.findMany({
    where: { studentId: demoStudent?.id ?? "", status: "PUBLISHED" },
    select: {
      examId: true,
      subjectId: true,
      resultSheetId: true,
      marks: true,
      grade: true,
      gpa: true,
    },
  });

  for (const row of demoResults) {
    await prisma.examResult.upsert({
      where: {
        examId_studentId_subjectId: {
          examId: row.examId,
          studentId: student.id,
          subjectId: row.subjectId,
        },
      },
      update: {},
      create: {
        id: `b5-result-${row.examId}-${row.subjectId}`,
        examId: row.examId,
        studentId: student.id,
        subjectId: row.subjectId,
        resultSheetId: row.resultSheetId,
        marks: row.marks,
        grade: row.grade,
        gpa: row.gpa,
        status: "PUBLISHED",
      },
    });
  }

  // A fee line of the student, so the fees table has something to show.
  const structure = await prisma.feeStructure.findFirst({
    where: { classId: demo.classId },
    select: { id: true, monthlyTuitionPoisha: true, activitiesPoisha: true, dueDate: true },
  });

  if (structure) {
    await prisma.fee.upsert({
      where: { id: `fee-${LOGIN_ID}-tuition` },
      update: {},
      create: {
        id: `fee-${LOGIN_ID}-tuition`,
        studentId: student.id,
        feeStructureId: structure.id,
        label: "November tuition",
        // Every line belongs to a billing slot, so a student holds one fee per
        // slot and per line.
        period: "2026-11:tuition",
        amountPoisha: structure.monthlyTuitionPoisha,
        dueDate: structure.dueDate,
        status: "DUE",
      },
    });
  }

  console.log(`${LOGIN_ID} / ${PASSWORD}`);

  return LOGIN_ID;
}

export async function removeCheckStudent(): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { userId: `user-${LOGIN_ID}` },
    select: { id: true },
  });

  if (student) {
    await prisma.paymentItem.deleteMany({
      where: { payment: { studentId: student.id } },
    });
    await prisma.payment.deleteMany({ where: { studentId: student.id } });
    await prisma.receipt.deleteMany({ where: { studentId: student.id } });
    await prisma.fee.deleteMany({ where: { studentId: student.id } });
    await prisma.examResult.deleteMany({ where: { studentId: student.id } });
    await prisma.attendance.deleteMany({ where: { studentId: student.id } });
    await prisma.auditLog.deleteMany({ where: { actorId: `user-${LOGIN_ID}` } });
    await prisma.student.delete({ where: { id: student.id } });
  }

  await prisma.user.deleteMany({ where: { loginId: LOGIN_ID } });
}

export { LOGIN_ID as CHECK_LOGIN_ID, PASSWORD as CHECK_PASSWORD };
