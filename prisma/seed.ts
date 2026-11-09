/**
 * The seed for the Narail Collectorate School database.
 *
 * It writes the school structure and the demo data the UI already shows, so
 * the pages look the same once they read from the database instead of the
 * mock files in `src/data`.
 *
 * The seed is idempotent: every row is written with an upsert on its unique
 * key, so running it twice leaves the database exactly as running it once
 * did. It never deletes a row.
 *
 * Run it with `npm run db:seed`, or `npm run db:reset` to drop the database
 * and build it again from scratch.
 */
import "dotenv/config";

import bcrypt from "bcryptjs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  DEFAULT_SECTION_NAME,
  SEED_CLASSES,
  SEED_FAKE_STUDENT_NAMES,
} from "./seed-data/classes";
import { SEED_DEMO_DATA } from "./seed-data/demo";
import { isoDate, normalizeLoginId, requiredEnv, slug } from "./seed-data/helpers";
import {
  mergeLegacyPeSubject,
  seedAttendance,
  seedAuditLog,
  seedCalendar,
  seedExamsAndResults,
  seedFees,
  seedGallery,
  seedNotices,
  seedRoutines,
  seedSiteContent,
} from "./seed-data/seed-parts";

/** The cost every password hash is made with. */
const BCRYPT_COST = 12;

/** The academic year the seeded data belongs to. */
const ACADEMIC_YEAR = {
  id: "academic-year-2026",
  name: "2026",
  startDate: new Date("2026-01-01T00:00:00.000Z"),
  endDate: new Date("2026-12-31T00:00:00.000Z"),
  isCurrent: true,
} as const;

/** Builds the client the seed writes through. */
function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
    );
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

async function main(): Promise<void> {
  const prisma = createClient();

  const adminLogin = requiredEnv("SEED_ADMIN_LOGIN");
  const adminPassword = requiredEnv("SEED_ADMIN_PASSWORD");
  const demoPassword = requiredEnv("SEED_DEMO_PASSWORD");

  // The hashes are made once and reused, so the seed does not spend a minute
  // hashing the same password a hundred times.
  const adminHash = await bcrypt.hash(adminPassword, BCRYPT_COST);
  const demoHash = await bcrypt.hash(demoPassword, BCRYPT_COST);

  /* ------------------------------------------------------------- accounts --- */

  const admin = await prisma.user.upsert({
    where: { loginIdNormalized: normalizeLoginId(adminLogin) },
    update: {
      loginId: adminLogin,
      name: "School Administrator",
      role: "ADMIN",
      passwordHash: adminHash,
      isActive: true,
      mustChangePassword: true,
    },
    create: {
      id: "user-admin",
      loginId: adminLogin,
      loginIdNormalized: normalizeLoginId(adminLogin),
      name: "School Administrator",
      email: "admin@school.edu.bd",
      passwordHash: adminHash,
      role: "ADMIN",
      classOrDepartment: "Administration",
      isActive: true,
      mustChangePassword: true,
    },
  });

  /* ------------------------------------------------------- academic year --- */

  await prisma.academicYear.upsert({
    where: { name: ACADEMIC_YEAR.name },
    update: {
      startDate: ACADEMIC_YEAR.startDate,
      endDate: ACADEMIC_YEAR.endDate,
      isCurrent: ACADEMIC_YEAR.isCurrent,
    },
    create: ACADEMIC_YEAR,
  });

  /* -------------------------------------------------------------- classes --- */

  const sectionIds = new Map<string, string>();

  for (const seedClass of SEED_CLASSES) {
    await prisma.class.upsert({
      where: { name: seedClass.name },
      update: {
        sortOrder: seedClass.sortOrder,
        gradingMode: seedClass.gradingMode,
        academicYearId: ACADEMIC_YEAR.id,
      },
      create: {
        id: seedClass.id,
        name: seedClass.name,
        sortOrder: seedClass.sortOrder,
        gradingMode: seedClass.gradingMode,
        academicYearId: ACADEMIC_YEAR.id,
      },
    });

    // Every class runs one group, so it carries one section named "Default".
    const section = await prisma.section.upsert({
      where: {
        classId_name: { classId: seedClass.id, name: DEFAULT_SECTION_NAME },
      },
      update: { isDefault: true },
      create: {
        id: `${seedClass.id}-default`,
        classId: seedClass.id,
        name: DEFAULT_SECTION_NAME,
        isDefault: true,
      },
    });

    sectionIds.set(seedClass.id, section.id);
  }

  /* ------------------------------------------------------------- subjects --- */

  const subjectNames = new Set<string>();
  for (const seedClass of SEED_CLASSES) {
    for (const subject of seedClass.subjects) subjectNames.add(subject);
  }

  const subjectIds = new Map<string, string>();

  for (const name of subjectNames) {
    const subject = await prisma.subject.upsert({
      where: { name },
      update: {},
      create: { id: `subject-${slug(name)}`, name },
    });

    subjectIds.set(name, subject.id);
  }

  // "PE" and "Physical Education" are the same subject. An older database
  // may still hold the "PE" row, so it is merged into the full name and the
  // rows that pointed at it are moved across.
  await mergeLegacyPeSubject(prisma, subjectIds);

  /* ------------------------------------------------------------- teachers --- */

  const teacherIds = new Map<string, string>();
  const teacherUserIds = new Map<string, string>();

  for (const teacher of SEED_DEMO_DATA.teachers) {
    const loginId = `teacher-${slug(teacher.name)}`;

    const user = await prisma.user.upsert({
      where: { loginIdNormalized: normalizeLoginId(loginId) },
      update: {
        loginId,
        name: teacher.name,
        role: "TEACHER",
        passwordHash: demoHash,
        isActive: true,
        mustChangePassword: true,
      },
      create: {
        id: `user-${loginId}`,
        loginId,
        loginIdNormalized: normalizeLoginId(loginId),
        name: teacher.name,
        email: teacher.email,
        passwordHash: demoHash,
        role: "TEACHER",
        classOrDepartment: teacher.department,
        isActive: true,
        mustChangePassword: true,
      },
    });

    const record = await prisma.teacher.upsert({
      where: { userId: user.id },
      update: {
        designation: teacher.designation,
        department: teacher.department,
        subject: teacher.subject,
        phone: teacher.phone,
        photoUrl: teacher.photoUrl,
      },
      create: {
        id: teacher.id,
        userId: user.id,
        designation: teacher.designation,
        department: teacher.department,
        subject: teacher.subject,
        phone: teacher.phone,
        photoUrl: teacher.photoUrl,
      },
    });

    teacherIds.set(teacher.name, record.id);
    teacherUserIds.set(teacher.name, user.id);
  }

  /* --------------------------------------------- class subject allocation --- */

  for (const seedClass of SEED_CLASSES) {
    for (const subjectName of seedClass.subjects) {
      const subjectId = subjectIds.get(subjectName);

      if (subjectId === undefined) continue;

      const teacherName = SEED_DEMO_DATA.subjectTeachers[subjectName];
      const teacherId = teacherName ? teacherIds.get(teacherName) : undefined;

      await prisma.classSubject.upsert({
        where: {
          classId_subjectId: { classId: seedClass.id, subjectId },
        },
        update: { teacherId: teacherId ?? null },
        create: {
          id: `class-subject-${seedClass.id}-${slug(subjectName)}`,
          classId: seedClass.id,
          subjectId,
          teacherId: teacherId ?? null,
        },
      });
    }
  }

  /* ------------------------------------------------------ staff directory --- */

  for (const member of SEED_DEMO_DATA.staff) {
    await prisma.staff.upsert({
      where: { id: member.id },
      update: {
        name: member.name,
        designation: member.designation,
        subject: member.subject,
        department: member.department,
        staffType: member.staffType,
        email: member.email,
        photoUrl: member.photoUrl,
      },
      create: {
        id: member.id,
        name: member.name,
        designation: member.designation,
        subject: member.subject,
        department: member.department,
        staffType: member.staffType,
        email: member.email,
        photoUrl: member.photoUrl,
        photoWidth: member.photoWidth,
        photoHeight: member.photoHeight,
        position: member.position,
      },
    });
  }

  /* --------------------------------------------------------- class teachers --- */
  for (const seedClass of SEED_CLASSES) {
    const teacherName = SEED_DEMO_DATA.classTeachers[seedClass.id];

    if (!teacherName) continue;

    const teacherId = teacherIds.get(teacherName);
    const sectionId = sectionIds.get(seedClass.id);

    if (!teacherId || !sectionId) continue;

    await prisma.section.update({
      where: { id: sectionId },
      data: { classTeacherId: teacherId },
    });
  }

  /* -------------------------------------------------------------- students --- */

  const studentIds = new Map<string, string>();

  for (const student of SEED_DEMO_DATA.students) {
    const sectionId = sectionIds.get(student.classId);

    if (!sectionId) continue;

    const loginId = student.studentId;

    const user = await prisma.user.upsert({
      where: { loginIdNormalized: normalizeLoginId(loginId) },
      update: {
        loginId,
        name: student.name,
        role: "STUDENT",
        passwordHash: demoHash,
        isActive: true,
        mustChangePassword: true,
      },
      create: {
        id: `user-${loginId}`,
        loginId,
        loginIdNormalized: normalizeLoginId(loginId),
        name: student.name,
        email: student.email,
        passwordHash: demoHash,
        role: "STUDENT",
        classOrDepartment: student.className,
        isActive: true,
        mustChangePassword: true,
      },
    });

    const record = await prisma.student.upsert({
      where: { studentId: loginId },
      update: {
        name: student.name,
        classId: student.classId,
        sectionId,
        roll: student.roll,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        phone: student.phone,
        emergencyContact: student.emergencyContact,
        email: student.email,
        address: student.address,
        photoUrl: student.photoUrl,
        dateOfBirth: isoDate(student.dateOfBirth),
        academicYearId: ACADEMIC_YEAR.id,
      },
      create: {
        id: student.id,
        userId: user.id,
        studentId: loginId,
        name: student.name,
        classId: student.classId,
        sectionId,
        academicYearId: ACADEMIC_YEAR.id,
        roll: student.roll,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        phone: student.phone,
        emergencyContact: student.emergencyContact,
        email: student.email,
        address: student.address,
        photoUrl: student.photoUrl,
        dateOfBirth: isoDate(student.dateOfBirth),
      },
    });

    studentIds.set(student.id, record.id);
  }

  // The classes the mock data does not cover get a few fictional students.
  for (const [classId, names] of Object.entries(SEED_FAKE_STUDENT_NAMES)) {
    const sectionId = sectionIds.get(classId);
    const seedClass = SEED_CLASSES.find((entry) => entry.id === classId);

    if (!sectionId || !seedClass) continue;

    let roll = 1;

    for (const name of names) {
      const studentId = `ST-2026-F${seedClass.sortOrder}${String(roll).padStart(2, "0")}`;
      const email = `${slug(name)}@example.com`;

      const user = await prisma.user.upsert({
        where: { loginIdNormalized: normalizeLoginId(studentId) },
        update: {
          loginId: studentId,
          name,
          role: "STUDENT",
          passwordHash: demoHash,
          isActive: true,
          mustChangePassword: true,
        },
        create: {
          id: `user-${studentId}`,
          loginId: studentId,
          loginIdNormalized: normalizeLoginId(studentId),
          name,
          email,
          passwordHash: demoHash,
          role: "STUDENT",
          classOrDepartment: seedClass.name,
          isActive: true,
          mustChangePassword: true,
        },
      });

      const record = await prisma.student.upsert({
        where: { studentId },
        update: {
          name,
          classId,
          sectionId,
          roll,
          academicYearId: ACADEMIC_YEAR.id,
        },
        create: {
          id: `student-${studentId}`,
          userId: user.id,
          studentId,
          name,
          classId,
          sectionId,
          academicYearId: ACADEMIC_YEAR.id,
          roll,
          guardianName: `Guardian of ${name}`,
          guardianPhone: "+880 1700 000000",
          email,
          address: "Narail, Bangladesh",
          photoUrl: "/images/student.jpg",
          dateOfBirth: isoDate("2018-05-01"),
        },
      });

      studentIds.set(record.id, record.id);
      roll += 1;
    }
  }

  console.log("Seed: accounts, classes, subjects, staff and students written.");

  await seedAttendance(prisma, studentIds, sectionIds, teacherUserIds);
  await seedExamsAndResults(prisma, studentIds, subjectIds, teacherUserIds);
  await seedFees(prisma, studentIds, admin.id);
  await seedNotices(prisma, admin.id);
  await seedGallery(prisma, teacherUserIds);
  await seedRoutines(prisma, sectionIds, subjectIds, teacherIds);
  await seedCalendar(prisma);
  await seedAuditLog(prisma, admin.id);
  await seedSiteContent(prisma);

  await prisma.$disconnect();

  console.log("Seed: complete.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
