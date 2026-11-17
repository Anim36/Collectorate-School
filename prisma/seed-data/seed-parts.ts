/**
 * The seeded records that are not the school structure.
 *
 * Each function writes its tables with an upsert on the unique key of the
 * row, so the seed can be run again without duplicating anything.
 */
import type { PrismaClient } from "../../src/generated/prisma/client";
import type { AdminFeeStructureRow } from "@/data/admin-11c";
import type { Notice } from "@/data/notices";
import type { RoutineDay, RoutinePeriod } from "@/data/routine";
import { SEED_CLASSES } from "./classes";
import {
  DEMO_STUDENT_PAYMENTS,
  SEED_DEMO_DATA,
} from "./demo";
import { isoDate, isoDateTime, isoDateTimeSeconds, poisha, slug, upsertInChunks } from "./helpers";

/**
 * The name of the demo student, the one the student portal is measured with.
 */
const DEMO_STUDENT_NAME = "Arif Hasan";

/* --------------------------------------------------------------- subjects --- */

/**
 * Merges the old "PE" subject into "Physical Education".
 *
 * The school has one subject for it, called "Physical Education". A database
 * seeded before that rename still holds a "PE" row, so the rows that point at
 * it are moved across and the old row is removed.
 */
export async function mergeLegacyPeSubject(
  prisma: PrismaClient,
  subjectIds: Map<string, string>,
): Promise<void> {
  const legacy = await prisma.subject.findUnique({ where: { name: "PE" } });
  const targetId = subjectIds.get("Physical Education");

  if (!legacy || !targetId || legacy.id === targetId) return;

  await prisma.$transaction(async (tx) => {
    // The allocations move across. A class that already has the subject
    // keeps the row it has, so the old one is removed instead.
    const allocations = await tx.classSubject.findMany({
      where: { subjectId: legacy.id },
    });

    for (const allocation of allocations) {
      const existing = await tx.classSubject.findUnique({
        where: {
          classId_subjectId: {
            classId: allocation.classId,
            subjectId: targetId,
          },
        },
      });

      if (existing) {
        await tx.classSubject.delete({ where: { id: allocation.id } });
      } else {
        await tx.classSubject.update({
          where: { id: allocation.id },
          data: { subjectId: targetId },
        });
      }
    }

    await tx.examResult.updateMany({
      where: { subjectId: legacy.id },
      data: { subjectId: targetId },
    });

    await tx.routinePeriod.updateMany({
      where: { subjectId: legacy.id },
      data: { subjectId: targetId },
    });

    await tx.resultSheet.updateMany({
      where: { subjectId: legacy.id },
      data: { subjectId: targetId },
    });

    await tx.subject.delete({ where: { id: legacy.id } });
  });
}

/* ------------------------------------------------------------ attendance --- */

/**
 * The attendance of the demo students.
 *
 * The student portal shows three months of attendance and the teacher shows
 * a saved sheet per day, so the seeded attendance covers the days both of
 * them read.
 */
export async function seedAttendance(
  prisma: PrismaClient,
  studentIds: Map<string, string>,
  sectionIds: Map<string, string>,
  teacherUserIds: Map<string, string>,
): Promise<void> {
  const teacherId = teacherUserIds.get("Nusrat Jahan") ?? null;

  // The months the student attendance calendar shows, with the days the
  // school teaches on.
  const months: { year: number; month: number; days: number[] }[] = [
    { year: 2026, month: 9, days: [1, 2, 3, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 27, 28, 29, 30] },
    { year: 2026, month: 10, days: [1, 4, 5, 6, 7, 8, 11, 12, 13, 14, 15, 18, 19, 20, 21, 22, 25, 26, 27, 28, 29] },
    { year: 2026, month: 11, days: [2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 23, 24, 25, 27, 30] },
  ];

  // The students of the classes the teacher takes, so the marking table has
  // a roll to show.
  const teacherRollClasses = ["class-9", "class-8", "class-10"];

  const rows: {
    id: string;
    studentId: string;
    sectionId: string;
    date: Date;
    status: "PRESENT" | "ABSENT" | "LATE";
    markedById: string | null;
  }[] = [];

  for (const classId of teacherRollClasses) {
    const sectionId = sectionIds.get(classId);

    if (!sectionId) continue;

    for (const month of months) {
      for (const day of month.days) {
        // Every twentieth school day is an absence and every thirtieth is a
        // late arrival, so the summaries have something to report.
        const status =
          day % 20 === 0 ? "ABSENT" : day % 30 === 0 ? "LATE" : "PRESENT";

        const date = isoDate(
          `${month.year}-${String(month.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        );

        for (const student of SEED_DEMO_DATA.students) {
          if (student.classId !== classId) continue;

          const studentId = studentIds.get(student.id);
          if (!studentId) continue;

          rows.push({
            id: `attendance-${studentId}-${date.toISOString().slice(0, 10)}`,
            studentId,
            sectionId,
            date,
            status,
            markedById: teacherId,
          });
        }
      }
    }
  }

  // The rows are written in batches, so the seed does not make one round
  // trip per attendance record.
  await upsertInChunks(
    prisma,
    prisma.attendance,
    rows,
    (row) => ({
      where: { studentId_date: { studentId: row.studentId, date: row.date } },
      create: row,
      update: {
        status: row.status,
        sectionId: row.sectionId,
        markedById: row.markedById,
      },
    }),
  );

  // The saved sheets of the teacher, one per teaching day.
  const sheetDays = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"];
  const sheetRows: {
    id: string;
    sectionId: string;
    date: Date;
    markedById: string | null;
    savedAt: Date;
  }[] = [];

  for (const classId of teacherRollClasses) {
    const sectionId = sectionIds.get(classId);

    if (!sectionId) continue;

    for (const date of sheetDays) {
      sheetRows.push({
        id: `attendance-sheet-${classId}-${date}`,
        sectionId,
        date: isoDate(date),
        markedById: teacherId,
        savedAt: isoDateTime(`${date}T09:12`),
      });
    }
  }

  await upsertInChunks(
    prisma,
    prisma.attendanceSheet,
    sheetRows,
    (row) => ({
      where: {
        sectionId_date: { sectionId: row.sectionId, date: row.date },
      },
      create: row,
      update: { markedById: row.markedById },
    }),
  );

  console.log("Seed: attendance written.");
}

/* ------------------------------------------------------- exams and results --- */

/** The exams the mock data shows, with the marks of every student. */
const EXAMS = [
  {
    id: "exam-half-yearly-2026",
    name: "Half-yearly examination 2026",
    year: 2026,
    term: "Half-yearly",
    published: true,
    marks: {
      Bangla: 86,
      English: 82,
      Mathematics: 91,
      Science: 88,
      ICT: 76,
      Religion: 81,
      History: 78,
      "Physical Education": 90,
    } as Record<string, number>,
  },
  {
    id: "exam-mid-term-2026",
    name: "Mid-term examination 2026",
    year: 2026,
    term: "Mid-term",
    published: true,
    marks: {
      Bangla: 84,
      English: 80,
      Mathematics: 89,
      Science: 85,
      ICT: 74,
      Religion: 80,
      History: 77,
      "Physical Education": 88,
    } as Record<string, number>,
  },
  {
    id: "exam-annual-2025",
    name: "Annual examination 2025",
    year: 2025,
    term: "Annual",
    published: true,
    marks: {
      Bangla: 81,
      English: 78,
      Mathematics: 87,
      Science: 83,
      ICT: 72,
      Religion: 79,
      History: 75,
      "Physical Education": 86,
    } as Record<string, number>,
  },
] as const;

/**
 * The grade and the grade point of a mark.
 *
 * The bands mirror `gradeForMark` and `gpaForMark` in the teacher result
 * mock data.
 */
function gradeForMark(mark: number): { grade: string; gpa: string } {
  if (mark >= 80) return { grade: "A+", gpa: "5.0" };
  if (mark >= 70) return { grade: "A", gpa: "4.5" };
  if (mark >= 60) return { grade: "B", gpa: "4.0" };
  if (mark >= 50) return { grade: "C", gpa: "3.5" };
  return { grade: "D", gpa: "3.0" };
}

/**
 * The exams, the result sheets and the marks of every student.
 *
 * The mock data shows the exams of the students of Classes 6 to 10; the
 * marks come from the student result mock data, so the student portal shows
 * the same numbers as it does today.
 */
export async function seedExamsAndResults(
  prisma: PrismaClient,
  studentIds: Map<string, string>,
  subjectIds: Map<string, string>,
  teacherUserIds: Map<string, string>,
): Promise<void> {
  for (const exam of EXAMS) {
    await prisma.exam.upsert({
      where: { id: exam.id },
      update: {
        name: exam.name,
        year: exam.year,
        term: exam.term,
        published: exam.published,
      },
      create: {
        id: exam.id,
        name: exam.name,
        year: exam.year,
        term: exam.term,
        published: exam.published,
      },
    });
  }

  // The subjects the mock result data uses, and the class they belong to.
  const resultSubjects = [
    "Bangla",
    "English",
    "Mathematics",
    "Science",
    "ICT",
    "Religion",
    "History",
    "Physical Education",
  ];

  const sheetRows: {
    id: string;
    examId: string;
    classId: string;
    sectionId: string;
    subjectId: string;
    status: "PUBLISHED";
    savedAt: Date;
    publishedAt: Date;
    enteredById: string | null;
  }[] = [];

  const resultRows: {
    id: string;
    examId: string;
    studentId: string;
    subjectId: string;
    resultSheetId: string;
    marks: number;
    grade: string;
    gpa: number;
    status: "PUBLISHED";
    enteredById: string | null;
  }[] = [];

  for (const exam of EXAMS) {
    for (const classId of ["class-6", "class-7", "class-8", "class-9", "class-10"]) {
      const classStudents = SEED_DEMO_DATA.students.filter(
        (student) => student.classId === classId,
      );

      if (classStudents.length === 0) continue;

      for (const subjectName of resultSubjects) {
        const subjectId = subjectIds.get(subjectName);

        if (!subjectId) continue;

        const teacherName = SEED_DEMO_DATA.subjectTeachers[subjectName];
        const teacherId = teacherName ? teacherUserIds.get(teacherName) : undefined;

        // The sheet of one exam, one class and one subject.
        const sheetId = `result-sheet-${exam.id}-${classId}-${slug(subjectName)}`;

        sheetRows.push({
          id: sheetId,
          examId: exam.id,
          classId,
          sectionId: `${classId}-default`,
          subjectId,
          status: "PUBLISHED",
          savedAt: isoDateTime("2026-11-02T12:10"),
          publishedAt: isoDateTime("2026-11-02T12:10"),
          enteredById: teacherId ?? null,
        });

        for (const student of classStudents) {
          const studentId = studentIds.get(student.id);
          if (!studentId) continue;

          const base = exam.marks[subjectName] ?? 0;
          // Every student of a class differs a little, so the result table
          // does not show the same number down the column.
          const offset = (student.roll % 7) - 3;
          const mark = Math.max(0, Math.min(100, base + offset));
          const { grade, gpa } = gradeForMark(mark);

          resultRows.push({
            id: `exam-result-${exam.id}-${studentId}-${subjectId}`,
            examId: exam.id,
            studentId,
            subjectId,
            resultSheetId: sheetId,
            marks: mark,
            grade,
            gpa: Number(gpa),
            status: "PUBLISHED",
            enteredById: teacherId ?? null,
          });
        }
      }
    }
  }

  await upsertInChunks(
    prisma,
    prisma.resultSheet,
    sheetRows,
    (row) => ({
      where: {
        examId_sectionId_subjectId: {
          examId: row.examId,
          sectionId: row.sectionId,
          subjectId: row.subjectId,
        },
      },
      create: row,
      update: {
        status: row.status,
        publishedAt: row.publishedAt,
        enteredById: row.enteredById,
      },
    }),
  );

  await upsertInChunks(
    prisma,
    prisma.examResult,
    resultRows,
    (row) => ({
      where: {
        examId_studentId_subjectId: {
          examId: row.examId,
          studentId: row.studentId,
          subjectId: row.subjectId,
        },
      },
      create: row,
      update: {
        marks: row.marks,
        grade: row.grade,
        gpa: row.gpa,
        status: row.status,
      },
    }),
  );

  console.log("Seed: exams and results written.");
}

/* ------------------------------------------------------------------ fees --- */

/**
 * The billing slot the seed writes the fees of.
 *
 * Every line of the seed belongs to it, so the seed can tell the lines it
 * owns from the lines the admin issued later.
 */
const SEED_PERIOD = "2026-11";

/**
 * The prefix every payment of the seed carries.
 *
 * The seed writes its payments from scratch every time, so the rows an earlier
 * run left behind are found through this prefix.
 */
const SEEDED_PAYMENT_PREFIX = "payment-RCP-";

/**
 * The fee structure of every class, the fees of the demo students and the
 * payments already made.
 *
 * The amounts of the classes the mock data covers come from the admin fee
 * structure table; the other classes get amounts that rise with the class.
 */
export async function seedFees(
  prisma: PrismaClient,
  studentIds: Map<string, string>,
  adminId: string,
): Promise<void> {
  const dueDate = isoDate("2026-11-10");

  for (const seedClass of SEED_CLASSES) {
    // The mock fee structure covers the 6–8 and 9–10 bands; those amounts
    // are used for the classes inside the band.
    const band =
      seedClass.sortOrder >= 10
        ? SEED_DEMO_DATA.adminFeeStructure.find(
            (row: AdminFeeStructureRow) => row.classBand === "9–10",
          )
        : SEED_DEMO_DATA.adminFeeStructure.find(
            (row: AdminFeeStructureRow) => row.classBand === "6–8",
          );

    const monthlyTuition = band?.monthlyTuition ?? seedClass.monthlyTuition;
    const admissionFee = band?.admissionFee ?? seedClass.admissionFee;
    const activities = band?.activities ?? seedClass.activities;

    await prisma.feeStructure.upsert({
      where: {
        classId_academicYearId: {
          classId: seedClass.id,
          academicYearId: "academic-year-2026",
        },
      },
      update: {
        monthlyTuitionPoisha: poisha(monthlyTuition),
        admissionFeePoisha: poisha(admissionFee),
        activitiesPoisha: poisha(activities),
        dueDate,
      },
      create: {
        id: `fee-structure-${seedClass.id}`,
        classId: seedClass.id,
        academicYearId: "academic-year-2026",
        monthlyTuitionPoisha: poisha(monthlyTuition),
        admissionFeePoisha: poisha(admissionFee),
        activitiesPoisha: poisha(activities),
        dueDate,
      },
    });
  }

  // The fees of the demo students: the monthly tuition and the activities
  // fee of their class, both due on 10 November 2026.
  const structures = await prisma.feeStructure.findMany({
    where: { academicYearId: "academic-year-2026" },
  });
  const structureByClass = new Map(
    structures.map((structure) => [structure.classId, structure]),
  );

  const feeRows: {
    id: string;
    studentId: string;
    feeStructureId: string;
    label: string;
    period: string;
    amountPoisha: number;
    dueDate: Date;
    status: "DUE";
    invoiceNo: string;
  }[] = [];

  for (const student of SEED_DEMO_DATA.students) {
    const studentId = studentIds.get(student.id);
    if (!studentId) continue;

    const structure = structureByClass.get(student.classId);
    if (!structure) continue;

    // Every line belongs to a billing slot, so a student holds one fee per
    // slot and per line.
    const items = [
      {
        label: "November tuition",
        period: "2026-11:tuition",
        amount: structure.monthlyTuitionPoisha,
      },
      {
        label: "Annual activities",
        period: "2026-11:activities",
        amount: structure.activitiesPoisha,
      },
    ];

    // The demo student holds one more line, so the portal shows a payment
    // that was made and a payment that waits for the school on two different
    // lines.
    if (student.name === DEMO_STUDENT_NAME) {
      items.push({
        label: "Admission fee",
        period: "2026-11:admission",
        amount: structure.admissionFeePoisha,
      });
    }

    for (const item of items) {
      // The invoice number is worked out from the line itself, so the same
      // line always carries the same invoice and running the seed twice
      // changes nothing.
      const invoiceNo = `INV-2026-${invoiceNumberFor(
        studentId,
        item.period,
      )}`;

      feeRows.push({
        id: `fee-${studentId}-${slug(item.label)}`,
        studentId,
        feeStructureId: structure.id,
        label: item.label,
        period: item.period,
        amountPoisha: item.amount,
        dueDate,
        status: "DUE",
        invoiceNo,
      });
    }
  }

  await upsertInChunks(
    prisma,
    prisma.fee,
    feeRows,
    (row) => ({
      where: {
        studentId_label_dueDate: {
          studentId: row.studentId,
          label: row.label,
          dueDate: row.dueDate,
        },
      },
      create: row,
      update: {
        amountPoisha: row.amountPoisha,
        invoiceNo: row.invoiceNo,
        period: row.period,
        // The line is put back to due. A check that paid it, or an admin who
        // paid it, must not survive a run of the seed: the seed describes the
        // school as it is, and the payments below put the paid lines back.
        status: "DUE",
        paidAt: null,
      },
    }),
  );

  // The payments the admin fees table shows, converted into payments against
  // the fees of the students they belong to.
  //
  // The receipt number comes from the mock row itself, so the same payment
  // always carries the same receipt and running the seed twice changes
  // nothing.
  //
  // The school has a name in more than one class (there is a "Tanvir Ahmed"
  // in Class 9 and one in Class 6), so a row takes the first student of its
  // name that no other row has taken yet.
  const takenBy = new Set<string>();

  // The mock rows and the students they belong to, worked out before anything
  // is written: a name can be in more than one class, and the first student
  // of that name a row has not taken yet is the one the row is about.
  const mapped: { payment: (typeof SEED_DEMO_DATA.adminPayments)[number]; studentId: string }[] = [];

  for (const payment of SEED_DEMO_DATA.adminPayments) {
    // The demo student has payments of its own below, so the admin table does
    // not write one for them: two waiting payments for the same line cannot
    // exist, and the seed would run into its own rule.
    if (payment.student === DEMO_STUDENT_NAME) continue;

    const student = SEED_DEMO_DATA.students.find(
      (candidate) =>
        candidate.name === payment.student && !takenBy.has(candidate.id),
    );

    if (!student) continue;

    takenBy.add(student.id);

    const studentId = studentIds.get(student.id);
    if (!studentId) continue;

    mapped.push({ payment, studentId });
  }

  // The payments of the seed are written from scratch every time, so the rows
  // an earlier run left behind are taken off first and the lines they settled
  // are released.
  //
  // Without this a payment that waits for the admin could sit on a line that
  // is already paid, and the admin could never approve it: the approval
  // settles the lines of the payment, and a line that is paid is never
  // settled twice.
  const seededPayments = await prisma.payment.findMany({
    where: { id: { startsWith: SEEDED_PAYMENT_PREFIX } },
    select: { id: true },
  });

  const seededPaymentIds = seededPayments.map((payment) => payment.id);

  // The lines the seeded payments settled are released, so a line that waits
  // in a payment is free to be settled again.
  const released = await prisma.paymentItem.findMany({
    where: { paymentId: { in: seededPaymentIds } },
    select: { feeId: true },
  });

  await prisma.paymentItem.deleteMany({
    where: { paymentId: { in: seededPaymentIds } },
  });

  await prisma.receipt.deleteMany({
    where: { paymentId: { in: seededPaymentIds } },
  });

  await prisma.payment.deleteMany({
    where: { id: { in: seededPaymentIds } },
  });

  await prisma.fee.updateMany({
    where: { id: { in: released.map((item) => item.feeId) } },
    data: { status: "DUE", paidAt: null },
  });

  for (const { payment, studentId } of mapped) {
    // Only the lines of the billing slot the seed writes are settled, and
    // only the lines of this student: a payment never settles the fees of
    // another student, and a slot the admin issued later is left alone.
    const fees = await prisma.fee.findMany({
      where: { studentId, status: "DUE", period: { startsWith: SEED_PERIOD } },
      orderBy: { label: "asc" },
    });

    if (fees.length === 0) continue;

    const total = fees.reduce((sum, fee) => sum + fee.amountPoisha, 0);

    // A payment that is still due carries no receipt, so the number of one
    // that waits is worked out from the row it came from.
    const receiptNo =
      payment.receipt === ""
        ? `RCP-2026-${payment.id.replace("payment-", "")}`
        : payment.receipt;

    const isPaid = payment.status === "Paid";
    const paidAt = payment.paidOn
      ? isoDateTime(`${payment.paidOn}T10:00`)
      : null;

    const method = methodFor(payment.method);

    const record = await prisma.payment.upsert({
      where: { transactionId: `TX-${receiptNo}` },
      update: {
        studentId,
        amountPoisha: total,
        method,
        status: isPaid ? "COMPLETED" : "PENDING",
        paidAt,
      },
      create: {
        id: `payment-${receiptNo}`,
        studentId,
        amountPoisha: total,
        method,
        status: isPaid ? "COMPLETED" : "PENDING",
        transactionId: `TX-${receiptNo}`,
        paidAt,
        recordedById: adminId,
      },
    });

    // Only a payment that was made carries a receipt. A payment that still
    // waits for the admin has not been settled, so it has no receipt yet.
    if (isPaid) {
      await prisma.receipt.upsert({
        where: { receiptNo },
        update: { amountPoisha: total, issuedAt: paidAt ?? new Date() },
        create: {
          id: `receipt-${receiptNo}`,
          receiptNo,
          paymentId: record.id,
          studentId,
          amountPoisha: total,
          issuedAt: paidAt ?? new Date(),
        },
      });
    } else {
      await prisma.receipt.deleteMany({ where: { paymentId: record.id } });
    }

    for (const fee of fees) {
      await prisma.paymentItem.upsert({
        where: { paymentId_feeId: { paymentId: record.id, feeId: fee.id } },
        update: { amountPoisha: fee.amountPoisha },
        create: {
          id: `payment-item-${record.id}-${fee.id}`,
          paymentId: record.id,
          feeId: fee.id,
          amountPoisha: fee.amountPoisha,
        },
      });

      if (isPaid) {
        await prisma.fee.update({
          where: { id: fee.id },
          data: {
            status: "PAID",
            paidAt: paidAt ?? null,
          },
        });
      }
    }
  }

  // The payments of the demo student.
  //
  // The demo student holds three fee lines: the tuition, the activities fee
  // and the admission fee. One payment settles the tuition and the activities
  // fee and carries its receipt; the other one waits for the school and holds
  // the admission fee. The two payments never share a line, so the rule that a
  // line sits in one waiting payment only is kept.
  const demoStudentId = studentIds.get(
    SEED_DEMO_DATA.students.find(
      (student) => student.name === DEMO_STUDENT_NAME,
    )?.id ?? "",
  );

  if (demoStudentId) {
    const demoFees = await prisma.fee.findMany({
      where: { studentId: demoStudentId, period: { startsWith: SEED_PERIOD } },
      orderBy: { label: "asc" },
      select: { id: true, label: true, period: true, amountPoisha: true },
    });

    // The lines the payment that was made settles, and the line the waiting
    // payment holds. They are picked by their slot, so the seed writes the
    // same split every time it is run.
    const settledFees = demoFees.filter(
      (fee) => fee.period === "2026-11:tuition" || fee.period === "2026-11:activities",
    );
    const waitingFees = demoFees.filter((fee) => fee.period === "2026-11:admission");

    await writeDemoStudentPayment({
      prisma,
      studentId: demoStudentId,
      adminId,
      payment: DEMO_STUDENT_PAYMENTS[0],
      fees: settledFees,
    });

    await writeDemoStudentPayment({
      prisma,
      studentId: demoStudentId,
      adminId,
      payment: DEMO_STUDENT_PAYMENTS[1],
      fees: waitingFees,
    });
  }

  console.log("Seed: fee structure, fees and payments written.");
}

/**
 * Writes one payment of the demo student and the lines it settles.
 *
 * The payment is written from scratch every time, so the rows an earlier run
 * left behind are taken off first. A payment that was made carries its
 * receipt; a payment that waits for the school carries the number the money
 * was sent from and no receipt.
 */
async function writeDemoStudentPayment({
  prisma,
  studentId,
  adminId,
  payment,
  fees,
}: {
  prisma: PrismaClient;
  studentId: string;
  adminId: string;
  payment: (typeof DEMO_STUDENT_PAYMENTS)[number];
  fees: readonly {
    id: string;
    label: string;
    period: string;
    amountPoisha: number;
  }[];
}): Promise<void> {
  if (fees.length === 0) return;

  const paymentId = `payment-${payment.receiptNo}`;
  const paidAt = isoDateTime(`${payment.paidOn}T10:00`);
  const total = fees.reduce((sum, fee) => sum + fee.amountPoisha, 0);

  // The rows of an earlier run are taken off first, so the payment and the
  // lines it holds are written exactly as the seed describes them.
  await prisma.paymentItem.deleteMany({ where: { paymentId } });
  await prisma.receipt.deleteMany({ where: { paymentId } });
  await prisma.payment.deleteMany({ where: { id: paymentId } });

  await prisma.fee.updateMany({
    where: { id: { in: fees.map((fee) => fee.id) } },
    data: { status: "DUE", paidAt: null },
  });

  await prisma.payment.create({
    data: {
      id: paymentId,
      studentId,
      amountPoisha: total,
      method: methodFor(payment.method),
      transactionId: payment.transactionId,
      // The number the money was sent from. The office matches the payment
      // with the statement of the wallet, so it is kept with the payment.
      senderMobile: payment.senderMobile,
      status: payment.settled ? "COMPLETED" : "PENDING",
      paidAt: payment.settled ? paidAt : null,
      recordedById: adminId,
    },
  });

  for (const fee of fees) {
    await prisma.paymentItem.create({
      data: {
        id: `payment-item-${paymentId}-${fee.id}`,
        paymentId,
        feeId: fee.id,
        amountPoisha: fee.amountPoisha,
      },
    });
  }

  // Only a payment that was made carries a receipt. A payment that still
  // waits for the school has not been settled, so it has no receipt yet.
  if (payment.settled) {
    await prisma.receipt.create({
      data: {
        id: `receipt-${payment.receiptNo}`,
        receiptNo: payment.receiptNo,
        paymentId,
        studentId,
        amountPoisha: total,
        issuedAt: paidAt,
      },
    });

    await prisma.fee.updateMany({
      where: { id: { in: fees.map((fee) => fee.id) } },
      data: { status: "PAID", paidAt },
    });
  }
}

/**
 * The invoice number of a fee line.
 *
 * The number is worked out from the student and the billing slot, so the same
 * line always carries the same invoice. A counter would shift every time the
 * seed is run, because the students it settles change with the payments.
 */
function invoiceNumberFor(studentId: string, period: string): string {
  const key = `${studentId}|${period}`;

  const digest = key
    .split("")
    .reduce(
      (total, character) => (total * 31 + character.charCodeAt(0)) % 1_000_000,
      7,
    );

  return String(digest).padStart(6, "0");
}

/** The payment method of the admin table, as the enum value. */
function methodFor(
  method: string,
): "BKASH" | "NAGAD" | "CARD" | "CASH" | "BANK_TRANSFER" {
  switch (method) {
    case "bKash":
      return "BKASH";
    case "Nagad":
      return "NAGAD";
    case "Cash":
      return "CASH";
    case "Bank transfer":
      return "BANK_TRANSFER";
    default:
      return "CASH";
  }
}

/* ---------------------------------------------------------------- notices --- */

/**
 * The notices of the school.
 *
 * The public notice board and the admin notice editor read the same table,
 * so both the published notices of the mock data and the admin drafts are
 * written.
 */
export async function seedNotices(
  prisma: PrismaClient,
  adminId: string,
): Promise<void> {
  // The notice of the week.
  //
  // The dashboard counts the notices that were published in the last seven
  // days, so the seed writes one that is always inside that window. It is
  // dated relative to the day the seed runs, so the count is never zero.
  const recentNoticeId = "notice-weekly-update";
  const recentPublishedOn = new Date();
  recentPublishedOn.setUTCHours(0, 0, 0, 0);
  recentPublishedOn.setUTCDate(recentPublishedOn.getUTCDate() - 2);

  await prisma.notice.upsert({
    where: { id: recentNoticeId },
    update: {
      title: "This week at the school",
      body: "The weekly update of the school: the classes that are on, the events of the week and the dates the office is closed.",
      category: "Academic",
      status: "PUBLISHED",
      publishedOn: recentPublishedOn,
    },
    create: {
      id: recentNoticeId,
      title: "This week at the school",
      body: "The weekly update of the school: the classes that are on, the events of the week and the dates the office is closed.",
      category: "Academic",
      eyebrow: "WEEKLY UPDATE",
      greeting: "Dear students,",
      signature: "The Office\nNarail Collectorate School",
      audience: "PUBLIC",
      audiences: ["PUBLIC", "STUDENTS"],
      status: "PUBLISHED",
      publishedOn: recentPublishedOn,
      authorId: adminId,
    },
  });

  // The public notice board.
  for (const notice of SEED_DEMO_DATA.notices) {
    const id = `notice-${notice.id}`;

    const record = await prisma.notice.upsert({
      where: { id },
      update: {
        title: notice.title,
        body: notice.body.join("\n\n"),
        category: notice.category,
        status: "PUBLISHED",
        publishedOn: isoDate(notice.publishedOn),
      },
      create: {
        id,
        title: notice.title,
        body: notice.body.join("\n\n"),
        category: notice.category,
        eyebrow: notice.eyebrow,
        greeting: notice.greeting,
        signature: notice.signature,
        audience: audienceFor(notice.audience[0]),
        audiences: notice.audience.map(audienceFor),
        status: "PUBLISHED",
        publishedOn: isoDate(notice.publishedOn),
        authorId: adminId,
      },
    });

    for (const attachment of notice.attachments) {
      await prisma.noticeAttachment.upsert({
        where: { id: `${id}-${slug(attachment.name)}` },
        update: { name: attachment.name, size: attachment.size },
        create: {
          id: `${id}-${slug(attachment.name)}`,
          noticeId: record.id,
          name: attachment.name,
          format: attachment.format,
          size: attachment.size,
        },
      });
    }
  }

  // The notices of the admin editor, which carry their own audiences.
  for (const notice of SEED_DEMO_DATA.adminNotices) {
    const id = `notice-${notice.id}`;

    if (SEED_DEMO_DATA.notices.some((row: Notice) => row.id === notice.id)) continue;

    const record = await prisma.notice.upsert({
      where: { id },
      update: {
        title: notice.title,
        body: notice.body,
        category: notice.category,
        audience: audienceFor(notice.audiences[0] ?? "Public"),
        audiences: notice.audiences.map(audienceFor),
        status: notice.status === "Published" ? "PUBLISHED" : "DRAFT",
      },
      create: {
        id,
        title: notice.title,
        body: notice.body,
        category: notice.category,
        audience: audienceFor(notice.audiences[0] ?? "Public"),
        audiences: notice.audiences.map(audienceFor),
        status: notice.status === "Published" ? "PUBLISHED" : "DRAFT",
        publishedOn: isoDate(notice.publishedOn),
        authorId: adminId,
      },
    });

    for (const attachment of notice.attachments) {
      await prisma.noticeAttachment.upsert({
        where: { id: `${id}-${slug(attachment.name)}` },
        update: { name: attachment.name, size: attachment.size },
        create: {
          id: `${id}-${slug(attachment.name)}`,
          noticeId: record.id,
          name: attachment.name,
          size: attachment.size,
        },
      });
    }
  }

  console.log("Seed: notices written.");
}

/** The main audience of a notice, as the enum value. */
function audienceFor(
  audience: string,
): "PUBLIC" | "STUDENTS" | "TEACHERS" | "GUARDIANS" {
  // The mock data writes the audiences in two styles: the public board uses
  // "everyone", "students", "guardians" and "staff", and the admin editor
  // uses "Public", "Students" and "Teachers". Both are read here.
  switch (audience.trim().toLowerCase()) {
    case "students":
    case "for students":
      return "STUDENTS";
    case "staff":
    case "teachers":
    case "for teachers":
      return "TEACHERS";
    case "guardians":
    case "for guardians":
      return "GUARDIANS";
    default:
      return "PUBLIC";
  }
}

/* ---------------------------------------------------------------- gallery --- */

/**
 * The albums and the photographs of the school.
 *
 * The photographs the mock data already ships with are written as approved
 * photos; the teacher uploads are written as pending, so the admin approval
 * queue has something to show.
 */
export async function seedGallery(
  prisma: PrismaClient,
  teacherUserIds: Map<string, string>,
): Promise<void> {
  const uploaderId = teacherUserIds.get("Nusrat Jahan") ?? null;

  for (const album of SEED_DEMO_DATA.galleryAlbums) {
    await prisma.galleryAlbum.upsert({
      where: { slug: album.id },
      update: {
        title: album.title,
        category: album.category,
        description: album.description,
        photoCount: album.photoCount,
      },
      create: {
        id: `album-${album.id}`,
        title: album.title,
        slug: album.id,
        category: album.category,
        visibility: "PUBLIC",
        description: album.description,
        coverUrl: album.photos[0]?.src ?? null,
        photoCount: album.photoCount,
        publishedOn: isoDate("2026-11-12"),
      },
    });

    for (const [index, photo] of album.photos.entries()) {
      await prisma.galleryPhoto.upsert({
        where: { id: `photo-${album.id}-${index + 1}` },
        update: { url: photo.src, caption: photo.alt },
        create: {
          id: `photo-${album.id}-${index + 1}`,
          albumId: `album-${album.id}`,
          url: photo.src,
          caption: photo.alt,
          name: `${album.id}-${index + 1}.jpg`,
          size: "1.8 MB",
          width: photo.width,
          height: photo.height,
          status: "APPROVED",
          uploadedById: uploaderId,
        },
      });
    }
  }

  // The two uploads the teacher gallery stages, waiting for the admin.
  const pendingUploads = [
    { name: "science-fair-01.jpg", url: "/images/science-fair.jpg", size: "2.4 MB" },
    { name: "science-fair-02.jpg", url: "/images/campus.jpg", size: "1.8 MB" },
  ];

  for (const [index, upload] of pendingUploads.entries()) {
    await prisma.galleryPhoto.upsert({
      where: { id: `photo-upload-${index + 1}` },
      update: { name: upload.name, url: upload.url },
      create: {
        id: `photo-upload-${index + 1}`,
        albumId: "album-science-fair-2026",
        url: upload.url,
        caption: "Teacher upload waiting for approval",
        name: upload.name,
        size: upload.size,
        width: 1024,
        height: 1024,
        status: "PENDING",
        uploadedById: uploaderId,
      },
    });
  }

  console.log("Seed: gallery albums and photos written.");
}

/* --------------------------------------------------------------- routines --- */

/**
 * The weekly timetable of every class.
 *
 * The mock data holds the timetable of Classes 6 to 10, with Class 9 as the
 * one the Figma frames draw. The classes the mock data does not cover get a
 * timetable of the subjects they actually teach, so every period of every
 * class holds a subject of that class.
 *
 * A teacher can only be in one class at a time, so a period only carries a
 * teacher when that teacher is free at that time. The classes that are
 * written first take the slots, so the class the Figma frames draw is the one
 * that is fully staffed.
 */
export async function seedRoutines(
  prisma: PrismaClient,
  sectionIds: Map<string, string>,
  subjectIds: Map<string, string>,
  teacherIds: Map<string, string>,
): Promise<void> {
  const periodTimes = [
    "08:00",
    "08:45",
    "09:30",
    "10:15",
    "11:30",
    "12:15",
    "13:00",
    "13:45",
  ];

  const days = 5;
  const periods = 8;

  // The routines themselves are written first, so the periods of every class
  // can be written in one pass over the days and the periods.
  for (const seedClass of SEED_CLASSES) {
    const sectionId = sectionIds.get(seedClass.id);
    if (!sectionId) continue;

    const effectiveFrom = isoDate("2026-11-01");

    await prisma.routine.upsert({
      where: {
        classId_sectionId_effectiveFrom: {
          classId: seedClass.id,
          sectionId,
          effectiveFrom,
        },
      },
      update: { published: true },
      create: {
        id: `routine-${seedClass.id}`,
        classId: seedClass.id,
        sectionId,
        effectiveFrom,
        published: true,
      },
    });
  }

  // The timetable of every class, and the order the classes take the teacher
  // slots in.
  const timetables = SEED_CLASSES.map((seedClass) => ({
    seedClass,
    subjects: periodsOfClass(seedClass, days, periods),
  }));

  const priority = [...timetables].sort(
    (first, second) =>
      classPriority(first.seedClass.name) - classPriority(second.seedClass.name),
  );

  // A teacher can only be in one class at a time, so the slots a teacher has
  // already taken are remembered while the classes are written.
  const taken = new Set<string>();

  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    for (let periodIndex = 0; periodIndex < periods; periodIndex += 1) {
      for (const entry of priority) {
        const subjectName = entry.subjects[dayIndex]?.[periodIndex];
        if (!subjectName) continue;

        const subjectId = subjectIds.get(subjectName);
        if (!subjectId) continue;

        const teacherName = SEED_DEMO_DATA.subjectTeachers[subjectName];
        const teacherId = teacherName ? teacherIds.get(teacherName) ?? null : null;

        // The teacher is only written when the teacher is free at that time.
        const slot = teacherId
          ? `${teacherId}-${dayIndex}-${periodIndex}`
          : "";

        let freeTeacherId = teacherId;

        if (teacherId && taken.has(slot)) {
          freeTeacherId = null;
        } else if (teacherId) {
          taken.add(slot);
        }

        const routineId = `routine-${entry.seedClass.id}`;

        await prisma.routinePeriod.upsert({
          where: {
            routineId_day_period: {
              routineId,
              day: dayIndex,
              period: periodIndex + 1,
            },
          },
          update: {
            subjectId,
            teacherId: freeTeacherId,
            startTime: periodTimes[periodIndex],
            endTime: periodTimes[periodIndex + 1] ?? "14:30",
            room: subjectName === "Science" ? "Lab 1" : null,
          },
          create: {
            id: `routine-period-${entry.seedClass.id}-${dayIndex}-${periodIndex + 1}`,
            routineId,
            day: dayIndex,
            period: periodIndex + 1,
            subjectId,
            teacherId: freeTeacherId,
            startTime: periodTimes[periodIndex],
            endTime: periodTimes[periodIndex + 1] ?? "14:30",
            room: subjectName === "Science" ? "Lab 1" : null,
          },
        });
      }
    }
  }

  console.log("Seed: routines written.");
}

/**
 * The order the classes take the teacher slots in.
 *
 * The class the Figma frames draw is written first, so it is the one that is
 * fully staffed.
 */
function classPriority(name: string): number {
  return name === "Class 9" ? 0 : 1;
}

/**
 * The timetable of one class.
 *
 * The classes the mock data covers keep the timetable of the mock data, with
 * the names the database uses. The other classes cycle through the subjects
 * they teach, so every period holds a subject of that class.
 */
function periodsOfClass(
  seedClass: (typeof SEED_CLASSES)[number],
  days: number,
  periods: number,
): string[][] {
  const mock = SEED_DEMO_DATA.routineTimetable[
    seedClass.name as keyof typeof SEED_DEMO_DATA.routineTimetable
  ];

  if (mock) {
    return mock.map((day: RoutineDay) =>
      day.periods.map((period: RoutinePeriod) => subjectKey(period.subject)),
    );
  }

  const subjects = seedClass.subjects;

  return Array.from({ length: days }, (_, day) =>
    Array.from(
      { length: periods },
      (_, period) => subjects[(day * 2 + period) % subjects.length],
    ),
  );
}

/** The name a subject of the mock data carries in the database. */
function subjectKey(name: string): string {
  if (name === "Math") return "Mathematics";
  if (name === "PE") return "Physical Education";

  return name;
}

/* --------------------------------------------------------------- calendar --- */

/** The entries of the academic calendar. */
export async function seedCalendar(prisma: PrismaClient): Promise<void> {
  const adminRows = SEED_DEMO_DATA.adminCalendarRows;

  for (const row of adminRows) {
    await prisma.calendarEvent.upsert({
      where: { id: `calendar-${row.id}` },
      update: { title: row.title, type: eventTypeFor(row.type), date: isoDate(row.date) },
      create: {
        id: `calendar-${row.id}`,
        title: row.title,
        date: isoDate(row.date),
        type: eventTypeFor(row.type),
        audience: row.audience,
      },
    });
  }

  // The public calendar carries more entries than the admin table.
  for (const event of SEED_DEMO_DATA.calendarEvents) {
    const id = `calendar-public-${event.year}-${event.month}-${event.day}`;

    await prisma.calendarEvent.upsert({
      where: { id },
      update: { title: event.label, date: isoDate(dateOf(event)) },
      create: {
        id,
        title: event.label,
        date: isoDate(dateOf(event)),
        type: kindFor(event.kind),
        audience: "Everyone",
      },
    });
  }

  console.log("Seed: calendar events written.");
}

/** The date of a public calendar event. */
function dateOf(event: { year: number; month: number; day: number }): string {
  return `${event.year}-${String(event.month).padStart(2, "0")}-${String(event.day).padStart(2, "0")}`;
}

/** The type of an admin calendar row, as the enum value. */
function eventTypeFor(type: string): "EXAM" | "HOLIDAY" | "EVENT" {
  if (type === "Exam") return "EXAM";
  if (type === "Holiday") return "HOLIDAY";
  return "EVENT";
}

/** The type of a public calendar event, as the enum value. */
function kindFor(kind: string): "EXAM" | "HOLIDAY" | "EVENT" {
  if (kind === "Exam") return "EXAM";
  if (kind === "Holiday") return "HOLIDAY";
  return "EVENT";
}

/* -------------------------------------------------------------- audit log --- */

/** The audit log of the school. */
export async function seedAuditLog(
  prisma: PrismaClient,
  adminId: string,
): Promise<void> {
  for (const event of SEED_DEMO_DATA.adminAuditEvents) {
    await prisma.auditLog.upsert({
      where: { id: `audit-${event.id}` },
      update: { action: event.action, entityType: event.type },
      create: {
        id: `audit-${event.id}`,
        actorId: adminId,
        action: event.action,
        entityType: event.type,
        entityId: event.record,
        metadata: { time: event.time, user: event.user },
        createdAt: isoDateTimeSeconds(`2026-11-04T10:42:00`),
      },
    });
  }

  console.log("Seed: audit log written.");
}

/* ----------------------------------------------------------- site content --- */

/**
 * The copy of the public site: the admission steps, the quick links, the
 * school figures, the about page and the navigation.
 */
export async function seedSiteContent(prisma: PrismaClient): Promise<void> {
  for (const [index, step] of SEED_DEMO_DATA.admissionSteps.entries()) {
    await prisma.admissionStep.upsert({
      where: { id: `admission-step-${index + 1}` },
      update: { title: step.title, description: step.description },
      create: {
        id: `admission-step-${index + 1}`,
        title: step.title,
        description: step.description,
        position: index,
      },
    });
  }

  for (const [index, link] of SEED_DEMO_DATA.quickLinks.entries()) {
    await prisma.quickLink.upsert({
      where: { id: `quick-link-${index + 1}` },
      update: { label: link.label, href: link.href },
      create: {
        id: `quick-link-${index + 1}`,
        label: link.label,
        href: link.href,
        icon: link.icon.displayName ?? link.icon.name ?? null,
        position: index,
      },
    });
  }

  for (const [index, stat] of SEED_DEMO_DATA.schoolStats.entries()) {
    await prisma.schoolStat.upsert({
      where: { id: `school-stat-${index + 1}` },
      update: { label: stat.label, value: stat.value },
      create: {
        id: `school-stat-${index + 1}`,
        label: stat.label,
        value: stat.value,
        position: index,
      },
    });
  }

  console.log("Seed: site content written.");
}
