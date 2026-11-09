import { prisma } from "@/server/db";
import {
  ROUTINE_PERIOD_TIMES,
  saveRoutineSchema,
  type SaveRoutineInput,
  type ServiceResult,
} from "@/server/services/admin-11b-schemas";
import { writeAudit } from "@/server/services/audit";
import type {
  AdminRoutineCell as RoutineCell,
  AdminRoutineClassOption as RoutineClassOption,
  AdminRoutineSheet as RoutineSheet,
} from "@/types/admin-11b";

/**
 * The weekly timetable of a class.
 *
 * The school runs one group per class, so a timetable belongs to a class and
 * to the one section every class carries. There is no section to choose.
 */

/** The end time of a period, worked out from the period times. */
function endTimeOf(period: number): string {
  const next = ROUTINE_PERIOD_TIMES[period];

  return next ?? "14:30";
}

/**
 * The classes the admin can pick, in school order.
 *
 * Every class carries the one section it has, so there is no section to
 * choose.
 */
export async function listRoutineClasses(): Promise<
  ServiceResult<RoutineClassOption[]>
> {
  const classes = await prisma.class.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      subjects: {
        orderBy: { subject: { name: "asc" } },
        select: { subject: { select: { id: true, name: true } } },
      },
      sections: {
        where: { isDefault: true },
        select: {
          classTeacher: {
            select: { id: true, user: { select: { name: true } } },
          },
        },
      },
    },
  });

  // The teachers of the school, so a teacher can be picked for a period.
  const teachers = await prisma.teacher.findMany({
    where: { user: { isActive: true } },
    orderBy: { user: { name: "asc" } },
    select: { id: true, user: { select: { name: true } } },
  });

  const teacherOptions = teachers.map((teacher) => ({
    id: teacher.id,
    name: teacher.user.name,
  }));

  const rows: RoutineClassOption[] = classes.map((row) => {
    const classTeacher = row.sections[0]?.classTeacher;

    const options = classTeacher
      ? [
          ...teacherOptions.filter((teacher) => teacher.id !== classTeacher.id),
          { id: classTeacher.id, name: classTeacher.user.name },
        ]
      : teacherOptions;

    return {
      id: row.id,
      name: row.name,
      subjects: row.subjects.map((allocation) => allocation.subject),
      teachers: options,
    };
  });

  return { ok: true, data: rows };
}

/**
 * The timetable of a class.
 *
 * The routine that is in force is the one with the latest effective date that
 * is not in the future.
 */
export async function getRoutine(
  classId: string,
): Promise<ServiceResult<RoutineSheet>> {
  const classRow = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      sections: { where: { isDefault: true }, select: { id: true } },
    },
  });

  if (!classRow) {
    return { ok: false, error: "That class does not exist" };
  }

  const section = classRow.sections[0];

  if (!section) {
    return { ok: false, error: "That class has no section to hold a routine" };
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const routine = await prisma.routine.findFirst({
    where: {
      classId,
      sectionId: section.id,
      effectiveFrom: { lte: today },
    },
    orderBy: { effectiveFrom: "desc" },
    select: {
      id: true,
      effectiveFrom: true,
      published: true,
      periods: {
        orderBy: [{ day: "asc" }, { period: "asc" }],
        select: {
          day: true,
          period: true,
          subjectId: true,
          teacherId: true,
          startTime: true,
          endTime: true,
          subject: { select: { name: true } },
          teacher: { select: { user: { select: { name: true } } } },
        },
      },
    },
  });

  const cells: RoutineCell[] = (routine?.periods ?? []).map((period) => ({
    day: period.day,
    period: period.period,
    subjectId: period.subjectId,
    subjectName: period.subject?.name ?? null,
    teacherId: period.teacherId,
    teacherName: period.teacher?.user.name ?? null,
    startTime: period.startTime,
    endTime: period.endTime,
  }));

  return {
    ok: true,
    data: {
      classId: classRow.id,
      className: classRow.name,
      sectionId: section.id,
      effectiveFrom: routine
        ? routine.effectiveFrom.toISOString().slice(0, 10)
        : "",
      published: routine?.published ?? false,
      cells,
    },
  };
}

/**
 * Saves the timetable of a class.
 *
 * The periods are checked before they are written: the day and the period have
 * to be in range, the subject has to be allocated to the class, and a teacher
 * cannot be in two classes at the same time.
 */
export async function saveRoutine(
  actorId: string,
  raw: SaveRoutineInput,
): Promise<ServiceResult<{ id: string; published: boolean }>> {
  const parsed = saveRoutineSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "That routine is not valid",
    };
  }

  const input = parsed.data;

  const classRow = await prisma.class.findUnique({
    where: { id: input.classId },
    select: {
      id: true,
      name: true,
      sections: { where: { isDefault: true }, select: { id: true } },
      subjects: { select: { subjectId: true } },
    },
  });

  if (!classRow) {
    return { ok: false, error: "That class does not exist" };
  }

  const section = classRow.sections[0];

  if (!section) {
    return { ok: false, error: "That class has no section to hold a routine" };
  }

  const allocated = new Set(classRow.subjects.map((row) => row.subjectId));

  // The subjects and the teachers that can be picked.
  const subjects = await prisma.subject.findMany({
    where: { id: { in: [...allocated] } },
    select: { id: true, name: true },
  });

  const teachers = await prisma.teacher.findMany({
    where: { user: { isActive: true } },
    select: { id: true },
  });

  const activeTeachers = new Set(teachers.map((teacher) => teacher.id));

  for (const period of input.periods) {
    if (period.subjectId && !allocated.has(period.subjectId)) {
      const name =
        subjects.find((subject) => subject.id === period.subjectId)?.name ??
        "That subject";

      return {
        ok: false,
        error: `${name} is not taught in ${classRow.name}. Allocate it to the class first.`,
      };
    }

    if (period.teacherId && !activeTeachers.has(period.teacherId)) {
      return {
        ok: false,
        error: "That teacher is not an active member of the staff.",
      };
    }
  }

  // A teacher cannot be in two classes at the same time.
  const conflict = await findTeacherConflict({
    classId: classRow.id,
    periods: input.periods,
  });

  if (conflict) {
    return { ok: false, error: conflict };
  }

  const effectiveFrom = new Date(`${input.effectiveFrom}T00:00:00.000Z`);

  try {
    const routine = await prisma.routine.upsert({
      where: {
        classId_sectionId_effectiveFrom: {
          classId: classRow.id,
          sectionId: section.id,
          effectiveFrom,
        },
      },
      update: {},
      create: {
        classId: classRow.id,
        sectionId: section.id,
        effectiveFrom,
        published: false,
      },
      select: { id: true },
    });

    // The periods of the routine are written as they are, so a cell that is
    // cleared stays empty.
    await prisma.routinePeriod.deleteMany({
      where: { routineId: routine.id },
    });

    if (input.periods.length > 0) {
      await prisma.routinePeriod.createMany({
        data: input.periods.map((period) => ({
          routineId: routine.id,
          day: period.day,
          period: period.period,
          subjectId: period.subjectId || null,
          teacherId: period.teacherId || null,
          startTime: ROUTINE_PERIOD_TIMES[period.period - 1] ?? "08:00",
          endTime: endTimeOf(period.period),
        })),
      });
    }

    await writeAudit({
      actorId,
      action: "Routine saved",
      entityType: "Routine",
      entityId: routine.id,
      metadata: {
        className: classRow.name,
        effectiveFrom: input.effectiveFrom,
        periods: input.periods.length,
      },
    });

    return { ok: true, data: { id: routine.id, published: false } };
  } catch {
    return { ok: false, error: "The routine could not be saved" };
  }
}

/**
 * Publishes the timetable of a class.
 */
export async function publishRoutine(
  actorId: string,
  classId: string,
): Promise<ServiceResult<{ id: string }>> {
  const classRow = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, name: true },
  });

  if (!classRow) {
    return { ok: false, error: "That class does not exist" };
  }

  const routine = await prisma.routine.findFirst({
    where: { classId },
    orderBy: { effectiveFrom: "desc" },
    select: { id: true, effectiveFrom: true },
  });

  if (!routine) {
    return { ok: false, error: "Save the routine before publishing it" };
  }

  await prisma.routine.update({
    where: { id: routine.id },
    data: { published: true },
  });

  await writeAudit({
    actorId,
    action: "Routine published",
    entityType: "Routine",
    entityId: routine.id,
    metadata: { className: classRow.name },
  });

  return { ok: true, data: { id: routine.id } };
}

/**
 * The teacher who is already booked in another class at the same time.
 *
 * The message names the other class, so the admin knows where to look.
 */
async function findTeacherConflict(input: {
  classId: string;
  periods: { day: number; period: number; teacherId?: string }[];
}): Promise<string | null> {
  const booked = input.periods.filter(
    (period): period is { day: number; period: number; teacherId: string } =>
      Boolean(period.teacherId),
  );

  if (booked.length === 0) return null;

  const teacherIds = Array.from(
    new Set(booked.map((period) => period.teacherId)),
  );

  const taken = await prisma.routinePeriod.findMany({
    where: {
      teacherId: { in: teacherIds },
      routine: { classId: { not: input.classId } },
    },
    select: {
      day: true,
      period: true,
      teacherId: true,
      teacher: { select: { user: { select: { name: true } } } },
      routine: { select: { class: { select: { name: true } } } },
    },
  });

  for (const period of booked) {
    const clash = taken.find(
      (entry) =>
        entry.teacherId === period.teacherId &&
        entry.day === period.day &&
        entry.period === period.period,
    );

    if (clash) {
      const teacherName = clash.teacher?.user.name ?? "That teacher";

      return `${teacherName} already teaches ${clash.routine.class.name} in that period.`;
    }
  }

  return null;
}
