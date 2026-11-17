import { SEED_CLASSES } from "../../prisma/seed-data/classes";
import { SEED_DEMO_DATA } from "../../prisma/seed-data/demo";
import { slug } from "../../prisma/seed-data/helpers";
import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Puts the seeded allocations and the class teacher of one class back.
 *
 * A check that gives a throwaway teacher a class and a subject takes them away
 * from the teachers the seed gives them: the allocation of the class and the
 * subject is pointed at the throwaway teacher, and the section of the class
 * names it as the class teacher.
 *
 * The teardown of such a check therefore cannot simply delete the rows it
 * finds, because one of them is a row the school had before the check ran. This
 * function writes those rows back the way the seed describes them, so the class
 * is left the way it was found.
 */
export async function restoreSeededClassRows(
  prisma: PrismaClient,
  classId: string,
): Promise<void> {
  const seedClass = SEED_CLASSES.find((entry) => entry.id === classId);

  if (!seedClass) return;

  const [teachers, subjects] = await Promise.all([
    prisma.teacher.findMany({
      select: { id: true, user: { select: { name: true } } },
    }),
    prisma.subject.findMany({ select: { id: true, name: true } }),
  ]);

  const teacherByName = new Map(
    teachers.map((teacher) => [teacher.user.name, teacher.id]),
  );

  const subjectByName = new Map(
    subjects.map((subject) => [subject.name, subject.id]),
  );

  // The allocation of every subject of the class, with the teacher the seed
  // gives it. A subject the seed gives to nobody keeps no teacher.
  for (const subjectName of seedClass.subjects) {
    const subjectId = subjectByName.get(subjectName);

    if (subjectId === undefined) continue;

    const teacherName = SEED_DEMO_DATA.subjectTeachers[subjectName];
    const teacherId = teacherName
      ? (teacherByName.get(teacherName) ?? null)
      : null;

    await prisma.classSubject.upsert({
      where: { classId_subjectId: { classId, subjectId } },
      update: { teacherId },
      create: {
        id: `class-subject-${classId}-${slug(subjectName)}`,
        classId,
        subjectId,
        teacherId,
      },
    });
  }

  // The class teacher of the class, the one the seed gives it.
  const teacherName = SEED_DEMO_DATA.classTeachers[classId];
  const teacherId = teacherName ? teacherByName.get(teacherName) : undefined;

  const section = await prisma.section.findFirst({
    where: { classId, isDefault: true },
    select: { id: true },
  });

  if (!section) return;

  await prisma.section.update({
    where: { id: section.id },
    data: { classTeacherId: teacherId ?? null },
  });
}
