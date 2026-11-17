import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { restoreSeededClassRows } from "./seed-teacher-rows";

/**
 * Puts a QA student and a QA teacher in place.
 *
 * The portal pages are behind the sign-in, so the Figma comparison of a portal
 * page only measures the right page when the debug browser holds a session of
 * the right role. The admin account has its own script
 * (`scripts/qa/qa-admin-account.ts`); this one covers the other two roles.
 *
 * The accounts carry the `qa-` prefix, so they are easy to find and to remove.
 *
 * The portals read the school in the database, so an account on its own is not
 * enough: the student needs a `students` row and the teacher needs a
 * `teachers` row and a class to teach. Without them the pages render nothing,
 * and the comparison would measure an empty page against the Figma frame.
 *
 * The QA teacher takes over the class teacher of Class 9 and the allocation of
 * Science in it, so the teardown puts those rows back the way the seed
 * describes them.
 *
 * Usage:
 *   npx tsx scripts/qa/qa-portal-accounts.ts              put the accounts in place
 *   npx tsx scripts/qa/qa-portal-accounts.ts --teardown   take them away
 */

/** The ids of the accounts the comparisons sign in with. */
const ACCOUNTS = [
  {
    loginId: process.env.QA_STUDENT_LOGIN ?? "qa-student",
    role: "STUDENT" as const,
  },
  {
    loginId: process.env.QA_TEACHER_LOGIN ?? "qa-student-teacher",
    role: "TEACHER" as const,
  },
];

/** The password every one of them gets. */
const PASSWORD = process.env.QA_PORTAL_PASSWORD ?? "Qa-Student-Pass-2026!";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  for (const account of ACCOUNTS) {
    await prisma.user.upsert({
      where: { loginIdNormalized: account.loginId.toLowerCase() },
      update: {
        passwordHash,
        role: account.role,
        isActive: true,
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
      create: {
        loginId: account.loginId,
        loginIdNormalized: account.loginId.toLowerCase(),
        name: `QA ${account.role}`,
        email: `${account.loginId}@example.com`,
        passwordHash,
        role: account.role,
        isActive: true,
        mustChangePassword: false,
      },
    });
  }

  await putStudentInPlace();
  await putTeacherInPlace();

  console.log(
    `The QA accounts are ready: ${ACCOUNTS.map((a) => a.loginId).join(", ")}`,
  );

  await prisma.$disconnect();
}

/**
 * Takes the QA accounts away again.
 *
 * The rows the QA teacher took over are put back the way the seed describes
 * them, so the school is left the way it was found.
 */
async function takeAccountsAway(): Promise<void> {
  const loginId = ACCOUNTS[1].loginId;

  const user = await prisma.user.findUnique({
    where: { loginIdNormalized: loginId.toLowerCase() },
    select: { id: true, teacher: { select: { id: true } } },
  });

  if (user?.teacher) {
    const touched = await prisma.classSubject.findMany({
      where: { teacherId: user.teacher.id },
      select: { classId: true },
    });

    const classIds = new Set(touched.map((row) => row.classId));

    const sections = await prisma.section.findMany({
      where: { classTeacherId: user.teacher.id },
      select: { classId: true },
    });

    for (const section of sections) classIds.add(section.classId);

    for (const classId of classIds) {
      await restoreSeededClassRows(prisma, classId);
    }

    await prisma.teacher.delete({ where: { id: user.teacher.id } });
  }

  for (const account of ACCOUNTS) {
    await prisma.student.deleteMany({
      where: { user: { loginIdNormalized: account.loginId.toLowerCase() } },
    });
  }

  await prisma.user.deleteMany({
    where: {
      loginIdNormalized: {
        in: ACCOUNTS.map((account) => account.loginId.toLowerCase()),
      },
    },
  });
}

/**
 * Gives the QA student a row of its own.
 *
 * The student is a copy of the first student of Class 9, because the seed
 * writes the attendance, the results and the fees of that class, so the pages
 * have something to show.
 */
async function putStudentInPlace(): Promise<void> {
  const loginId = ACCOUNTS[0].loginId;

  const user = await prisma.user.findUnique({
    where: { loginIdNormalized: loginId.toLowerCase() },
    select: { id: true },
  });

  if (!user) return;

  const demo = await prisma.student.findFirst({
    where: { class: { name: "Class 9" } },
    orderBy: { roll: "asc" },
    select: { classId: true, sectionId: true, academicYearId: true },
  });

  if (!demo) return;

  await prisma.student.upsert({
    where: { userId: user.id },
    update: {
      classId: demo.classId,
      sectionId: demo.sectionId,
      academicYearId: demo.academicYearId,
    },
    create: {
      id: `student-${loginId}`,
      userId: user.id,
      studentId: "ST-QA-0001",
      name: "QA STUDENT",
      classId: demo.classId,
      sectionId: demo.sectionId,
      academicYearId: demo.academicYearId,
      roll: 997,
      guardianName: "Guardian",
      guardianPhone: "01700000000",
      phone: "01700000000",
      emergencyContact: "01800000000",
      email: `${loginId}@example.com`,
      address: "Narail",
    },
  });
}

/**
 * Gives the QA teacher a row of its own, and a class to teach.
 *
 * The teacher takes Science in Class 9 and is the class teacher of it, so the
 * attendance page and the results page have something to show.
 */
async function putTeacherInPlace(): Promise<void> {
  const loginId = ACCOUNTS[1].loginId;

  const user = await prisma.user.findUnique({
    where: { loginIdNormalized: loginId.toLowerCase() },
    select: { id: true },
  });

  if (!user) return;

  const teacher = await prisma.teacher.upsert({
    where: { userId: user.id },
    update: {
      department: "Science",
      subject: "Science",
      designation: "Teacher · Science",
    },
    create: {
      id: `teacher-${loginId}`,
      userId: user.id,
      department: "Science",
      subject: "Science",
      designation: "Teacher · Science",
    },
  });

  const class9 = await prisma.class.findFirst({
    where: { name: "Class 9" },
    select: {
      id: true,
      sections: { where: { isDefault: true }, select: { id: true }, take: 1 },
    },
  });

  const science = await prisma.subject.findFirst({
    where: { name: "Science" },
    select: { id: true },
  });

  const sectionId = class9?.sections[0]?.id;

  if (!class9 || !science || !sectionId) return;

  // The allocation is written on the row of the class and the subject, so
  // running the script again changes nothing.
  await prisma.classSubject.upsert({
    where: {
      classId_subjectId: { classId: class9.id, subjectId: science.id },
    },
    update: { teacherId: teacher.id },
    create: {
      id: `qa-class-subject-${class9.id}-${science.id}`,
      classId: class9.id,
      subjectId: science.id,
      teacherId: teacher.id,
    },
  });

  await prisma.section.update({
    where: { id: sectionId },
    data: { classTeacherId: teacher.id },
  });
}

/**
 * The entry point.
 *
 * The script puts the accounts in place by default, and `--teardown` takes them
 * away again.
 */
async function entry(): Promise<void> {
  if (process.argv.includes("--teardown")) {
    await takeAccountsAway();
    console.log("The QA accounts are removed.");
    await prisma.$disconnect();
    return;
  }

  await main();
}

void entry();
