import { prisma } from "@/server/db";
import type { ServiceResult } from "@/server/services/admin-schemas";

/* ------------------------------------------------------------------ types --- */

/** A page of classes. */
export interface ClassList {
  /** The classes of the page. */
  rows: ClassRow[];
  /** How many classes the school has. */
  total: number;
  /** The zero-based page that was read. */
  page: number;
  /** How many rows a page holds. */
  pageSize: number;
  /** How many pages there are. */
  pageCount: number;
}

/** A page of subject allocations. */
export interface AllocationList {
  /** The allocations of the page. */
  rows: AllocationRow[];
  /** How many allocations the school has. */
  total: number;
  /** The zero-based page that was read. */
  page: number;
  /** How many rows a page holds. */
  pageSize: number;
  /** How many pages there are. */
  pageCount: number;
}

/** A class of the school, as the admin table shows it. */
export interface ClassRow {
  /** The id of the class row. */
  id: string;
  /** The name of the class, e.g. "Class 9". */
  name: string;
  /** The position of the class in the school. */
  sortOrder: number;
  /** Whether the class is graded on a grade point or a letter grade only. */
  gradingMode: "GPA" | "GRADE_ONLY";
  /** How many students the class has. */
  students: number;
  /** The teacher in charge of the class. */
  classTeacher: string;
  /** How many subjects the class takes. */
  subjectCount: number;
}

/** A class option for a dropdown. */
export interface ClassOption {
  /** The id of the class row. */
  id: string;
  /** The name of the class, e.g. "Class 9". */
  name: string;
}

/** A subject of the school. */
export interface SubjectRow {
  /** The id of the subject row. */
  id: string;
  /** The name of the subject. */
  name: string;
}

/** A teacher that can be picked. */
export interface TeacherOption {
  /** The id of the teacher row. */
  id: string;
  /** The name of the teacher. */
  name: string;
}

/** A subject allocation: a subject, the class it is taught in and the teacher. */
export interface AllocationRow {
  /** The id of the allocation row. */
  id: string;
  /** The name of the subject. */
  subject: string;
  /** The name of the teacher. */
  teacher: string;
  /** The name of the class. */
  className: string;
}

/* -------------------------------------------------------------- utilities --- */

/**
 * Writes an audit row.
 *
 * The actor is the admin who made the change and the target is the record it
 * was made to.
 */
async function writeAudit(input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: (input.metadata ?? {}) as never,
      },
    });
  } catch {
    // The audit write must never break the change it records.
  }
}

/* ----------------------------------------------------------------- reads --- */

/**
 * The classes of the school, with their counts.
 *
 * They come back in school order, from Nursery to Class 10. The table is
 * paginated, so a page holds as many classes as the design draws.
 */
export async function listClasses(
  page = 0,
  pageSize = 5,
): Promise<ServiceResult<ClassList>> {
  const [total, classes] = await Promise.all([
    prisma.class.count(),
    prisma.class.findMany({
      orderBy: { sortOrder: "asc" },
      skip: page * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        sortOrder: true,
        gradingMode: true,
        _count: { select: { students: true, subjects: true } },
        sections: {
          where: { isDefault: true },
          select: {
            classTeacher: { select: { user: { select: { name: true } } } },
          },
          take: 1,
        },
      },
    }),
  ]);

  return {
    ok: true,
    data: {
      rows: classes.map((row) => ({
        id: row.id,
        name: row.name,
        sortOrder: row.sortOrder,
        gradingMode: row.gradingMode,
        students: row._count.students,
        subjectCount: row._count.subjects,
        classTeacher: row.sections[0]?.classTeacher?.user.name ?? "—",
      })),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

/**
 * The classes as options for a dropdown.
 */
export async function listClassOptions(): Promise<ServiceResult<ClassOption[]>> {
  const classes = await prisma.class.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return { ok: true, data: classes };
}

/**
 * The subjects of the school, in name order.
 */
export async function listSubjects(): Promise<ServiceResult<SubjectRow[]>> {
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return { ok: true, data: subjects };
}

/**
 * The teachers that can be picked, in name order.
 */
export async function listTeacherOptions(): Promise<
  ServiceResult<TeacherOption[]>
> {
  const teachers = await prisma.teacher.findMany({
    where: { user: { isActive: true } },
    orderBy: { user: { name: "asc" } },
    select: { id: true, user: { select: { name: true } } },
  });

  return {
    ok: true,
    data: teachers.map((teacher) => ({
      id: teacher.id,
      name: teacher.user.name,
    })),
  };
}

/**
 * The subject allocations of the school.
 *
 * The table is paginated, so a page holds as many allocations as the design
 * draws.
 */
export async function listAllocations(
  page = 0,
  pageSize = 3,
): Promise<ServiceResult<AllocationList>> {
  const [total, allocations] = await Promise.all([
    prisma.classSubject.count(),
    prisma.classSubject.findMany({
      orderBy: [{ subject: { name: "asc" } }, { class: { sortOrder: "asc" } }],
      skip: page * pageSize,
      take: pageSize,
      select: {
        id: true,
        subject: { select: { name: true } },
        class: { select: { name: true } },
        teacher: { select: { user: { select: { name: true } } } },
      },
    }),
  ]);

  return {
    ok: true,
    data: {
      rows: allocations.map((row) => ({
        id: row.id,
        subject: row.subject.name,
        className: row.class.name,
        teacher: row.teacher?.user.name ?? "—",
      })),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

/* ---------------------------------------------------------------- writes --- */

/**
 * Adds a class.
 *
 * The name has to be unique, and the class starts with no students and the
 * one default section every class has.
 */
export async function createClass(
  actorId: string,
  input: {
    name: string;
    sortOrder: number;
    gradingMode: "GPA" | "GRADE_ONLY";
    classTeacherId?: string;
  },
): Promise<ServiceResult<{ id: string; name: string }>> {
  const name = input.name.trim();

  if (name === "") {
    return { ok: false, error: "Enter the class name" };
  }

  const taken = await prisma.class.findUnique({
    where: { name },
    select: { id: true },
  });

  if (taken) {
    return { ok: false, error: "A class with that name already exists" };
  }

  if (input.classTeacherId) {
    const teacher = await prisma.teacher.findFirst({
      where: { id: input.classTeacherId, user: { isActive: true } },
      select: { id: true },
    });

    if (!teacher) {
      return { ok: false, error: "That teacher is not an active teacher" };
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.class.create({
      data: {
        name,
        sortOrder: input.sortOrder,
        gradingMode: input.gradingMode,
      },
      select: { id: true, name: true },
    });

    // Every class runs one group, so it gets one default section.
    await tx.section.create({
      data: {
        classId: row.id,
        name: "Default",
        isDefault: true,
        classTeacherId: input.classTeacherId,
      },
    });

    return row;
  });

  await writeAudit({
    actorId,
    action: "Class created",
    entityType: "Class",
    entityId: created.id,
    metadata: { name: created.name },
  });

  return { ok: true, data: created };
}

/**
 * Edits a class.
 *
 * The name has to stay unique and the class teacher has to be an active
 * teacher.
 */
export async function updateClass(
  actorId: string,
  input: {
    id: string;
    name: string;
    sortOrder: number;
    gradingMode: "GPA" | "GRADE_ONLY";
    classTeacherId?: string;
  },
): Promise<ServiceResult<{ id: string; name: string }>> {
  const name = input.name.trim();

  if (name === "") {
    return { ok: false, error: "Enter the class name" };
  }

  const existing = await prisma.class.findUnique({
    where: { id: input.id },
    select: { id: true, name: true },
  });

  if (!existing) {
    return { ok: false, error: "That class does not exist" };
  }

  const clash = await prisma.class.findUnique({
    where: { name },
    select: { id: true },
  });

  if (clash && clash.id !== input.id) {
    return { ok: false, error: "A class with that name already exists" };
  }

  if (input.classTeacherId) {
    const teacher = await prisma.teacher.findFirst({
      where: { id: input.classTeacherId, user: { isActive: true } },
      select: { id: true },
    });

    if (!teacher) {
      return { ok: false, error: "That teacher is not an active teacher" };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.class.update({
      where: { id: input.id },
      data: {
        name,
        sortOrder: input.sortOrder,
        gradingMode: input.gradingMode,
      },
    });

    // The class teacher lives on the default section of the class.
    const section = await tx.section.findFirst({
      where: { classId: input.id, isDefault: true },
      select: { id: true },
    });

    if (section) {
      await tx.section.update({
        where: { id: section.id },
        data: { classTeacherId: input.classTeacherId || null },
      });
    }
  });

  await writeAudit({
    actorId,
    action: "Class edited",
    entityType: "Class",
    entityId: input.id,
    metadata: { name },
  });

  return { ok: true, data: { id: input.id, name } };
}

/**
 * Removes a class.
 *
 * A class that has students, fees or results cannot be removed, because the
 * records belong to the children in it.
 */
export async function deleteClass(
  actorId: string,
  classId: string,
): Promise<ServiceResult<{ id: string }>> {
  const row = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      _count: { select: { students: true } },
    },
  });

  if (!row) {
    return { ok: false, error: "That class does not exist" };
  }

  if (row._count.students > 0) {
    return {
      ok: false,
      error: `That class still has ${row._count.students} student(s), so it cannot be removed`,
    };
  }

  const results = await prisma.examResult.count({
    where: { resultSheet: { classId } },
  });

  if (results > 0) {
    return {
      ok: false,
      error: "That class has results recorded against it, so it cannot be removed",
    };
  }

  const fees = await prisma.feeStructure.count({ where: { classId } });

  if (fees > 0) {
    return {
      ok: false,
      error: "That class has a fee structure, so it cannot be removed",
    };
  }

  await prisma.class.delete({ where: { id: classId } });

  await writeAudit({
    actorId,
    action: "Class removed",
    entityType: "Class",
    entityId: classId,
    metadata: { name: row.name },
  });

  return { ok: true, data: { id: classId } };
}

/**
 * Adds a subject, or renames one that is already there.
 */
export async function upsertSubject(
  actorId: string,
  input: { id?: string; name: string },
): Promise<ServiceResult<{ id: string; name: string }>> {
  const name = input.name.trim();

  if (name === "") {
    return { ok: false, error: "Enter the subject name" };
  }

  const clash = await prisma.subject.findUnique({
    where: { name },
    select: { id: true },
  });

  if (clash && clash.id !== input.id) {
    return { ok: false, error: "A subject with that name already exists" };
  }

  if (input.id) {
    const existing = await prisma.subject.findUnique({
      where: { id: input.id },
      select: { id: true },
    });

    if (!existing) {
      return { ok: false, error: "That subject does not exist" };
    }

    await prisma.subject.update({
      where: { id: input.id },
      data: { name },
    });

    await writeAudit({
      actorId,
      action: "Subject edited",
      entityType: "Subject",
      entityId: input.id,
      metadata: { name },
    });

    return { ok: true, data: { id: input.id, name } };
  }

  const created = await prisma.subject.create({
    data: { id: `subject-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name },
    select: { id: true, name: true },
  });

  await writeAudit({
    actorId,
    action: "Subject created",
    entityType: "Subject",
    entityId: created.id,
    metadata: { name },
  });

  return { ok: true, data: created };
}

/**
 * Assigns a subject to a class.
 *
 * The same subject cannot be assigned to the same class twice.
 */
export async function assignSubject(
  actorId: string,
  input: { classId: string; subjectId: string; teacherId?: string },
): Promise<ServiceResult<{ id: string }>> {
  const classRow = await prisma.class.findUnique({
    where: { id: input.classId },
    select: { id: true, name: true },
  });

  if (!classRow) {
    return { ok: false, error: "That class does not exist" };
  }

  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: { id: true, name: true },
  });

  if (!subject) {
    return { ok: false, error: "That subject does not exist" };
  }

  if (input.teacherId) {
    const teacher = await prisma.teacher.findFirst({
      where: { id: input.teacherId, user: { isActive: true } },
      select: { id: true },
    });

    if (!teacher) {
      return { ok: false, error: "That teacher is not an active teacher" };
    }
  }

  const existing = await prisma.classSubject.findUnique({
    where: {
      classId_subjectId: {
        classId: input.classId,
        subjectId: input.subjectId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return {
      ok: false,
      error: `${subject.name} is already assigned to ${classRow.name}`,
    };
  }

  const created = await prisma.classSubject.create({
    data: {
      classId: input.classId,
      subjectId: input.subjectId,
      teacherId: input.teacherId,
    },
    select: { id: true },
  });

  await writeAudit({
    actorId,
    action: "Subject assigned",
    entityType: "ClassSubject",
    entityId: created.id,
    metadata: { subject: subject.name, class: classRow.name },
  });

  return { ok: true, data: created };
}

/**
 * Removes a subject allocation.
 *
 * An allocation that has results or routine entries behind it is refused,
 * because removing it would take those records with it.
 */
export async function removeAllocation(
  actorId: string,
  allocationId: string,
): Promise<ServiceResult<{ id: string }>> {
  const allocation = await prisma.classSubject.findUnique({
    where: { id: allocationId },
    select: {
      id: true,
      subjectId: true,
      subject: { select: { name: true } },
      class: { select: { name: true } },
    },
  });

  if (!allocation) {
    return { ok: false, error: "That allocation does not exist" };
  }

  const withResults = await prisma.examResult.count({
    where: { subjectId: allocation.subjectId },
  });

  if (withResults > 0) {
    return {
      ok: false,
      error: `${allocation.subject.name} has results recorded against it, so the allocation cannot be removed`,
    };
  }

  const withRoutines = await prisma.routinePeriod.count({
    where: { subjectId: allocation.subjectId },
  });

  if (withRoutines > 0) {
    return {
      ok: false,
      error: `${allocation.subject.name} is in the routine, so the allocation cannot be removed`,
    };
  }

  await prisma.classSubject.delete({ where: { id: allocationId } });

  await writeAudit({
    actorId,
    action: "Subject unassigned",
    entityType: "ClassSubject",
    entityId: allocationId,
    metadata: { subject: allocation.subject.name, class: allocation.class.name },
  });

  return { ok: true, data: { id: allocationId } };
}
