/**
 * The production seed.
 *
 * It writes only what a new school needs to start:
 *
 *   - one administrator, with the password from `SEED_ADMIN_PASSWORD`,
 *   - the 2026 academic year,
 *   - the twelve classes, each with its one "Default" section,
 *   - the subjects the classes teach.
 *
 * It writes no demo student, no demo teacher, no demo password and no demo
 * content. The demo seed (`prisma/seed.ts`) is for a local database only and
 * refuses to run in production.
 *
 * Run it with `npm run seed:prod`. It is safe to run twice: the admin is
 * created once and an existing admin is not given a new password.
 */
import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_SECTION_NAME, SEED_CLASSES } from "./seed-data/classes";
import { normalizeLoginId, requiredEnv, slug } from "./seed-data/helpers";

const BCRYPT_COST = 12;

const ACADEMIC_YEAR = {
  id: "academic-year-2026",
  name: "2026",
  startDate: new Date("2026-01-01T00:00:00.000Z"),
  endDate: new Date("2026-12-31T00:00:00.000Z"),
  isCurrent: true,
} as const;

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const adminLogin = requiredEnv("SEED_ADMIN_LOGIN");
  const adminPassword = requiredEnv("SEED_ADMIN_PASSWORD");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    /* ------------------------------------------------------------- admin --- */

    const existingAdmin = await prisma.user.findUnique({
      where: { loginIdNormalized: normalizeLoginId(adminLogin) },
      select: { id: true },
    });

    if (existingAdmin) {
      console.log(
        `Admin "${adminLogin}" already exists; its password was left unchanged.`,
      );
    } else {
      const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_COST);

      await prisma.user.create({
        data: {
          id: "user-admin",
          loginId: adminLogin,
          loginIdNormalized: normalizeLoginId(adminLogin),
          name: "School Administrator",
          passwordHash,
          role: "ADMIN",
          classOrDepartment: "Administration",
          isActive: true,
          mustChangePassword: true,
        },
      });

      console.log(`Admin "${adminLogin}" created. The password is not printed.`);
    }

    /* ----------------------------------------------------- academic year --- */

    await prisma.academicYear.upsert({
      where: { name: ACADEMIC_YEAR.name },
      update: {
        startDate: ACADEMIC_YEAR.startDate,
        endDate: ACADEMIC_YEAR.endDate,
        isCurrent: ACADEMIC_YEAR.isCurrent,
      },
      create: ACADEMIC_YEAR,
    });

    /* ------------------------------------------------------------ classes --- */

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

      await prisma.section.upsert({
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
    }

    /* ----------------------------------------------------------- subjects --- */

    const subjectNames = new Set<string>();

    for (const seedClass of SEED_CLASSES) {
      for (const subject of seedClass.subjects) subjectNames.add(subject);
    }

    for (const name of subjectNames) {
      await prisma.subject.upsert({
        where: { name },
        update: {},
        create: { id: `subject-${slug(name)}`, name },
      });
    }

    /* ---------------------------------------------------------- no demo --- */

    const demoAccounts = await prisma.user.count({
      where: { role: { in: ["STUDENT", "TEACHER"] } },
    });

    console.log(
      `Production seed complete: 1 admin, ${SEED_CLASSES.length} classes, ${subjectNames.size} subjects. ${demoAccounts} student/teacher account(s) were already present and were not touched.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Seed failed.");
  process.exitCode = 1;
});
