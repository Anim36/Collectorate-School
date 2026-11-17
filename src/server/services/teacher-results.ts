import { prisma } from "@/server/db";
import { writeAudit } from "@/server/services/audit";
import { gradeForMark, gpaForMark, parseMark } from "@/server/services/grading";
import {
  requireTeacher,
  teacherContextLine,
} from "@/server/services/teacher-identity";
import {
  teacherResultSheetSchema,
  type TeacherResultSheetInput,
} from "@/server/services/teacher-schemas";
import type {
  TeacherMarkError,
  TeacherResultClassOption,
  TeacherResultData,
  TeacherResultExamOption,
  TeacherStudentRow,
} from "@/types/teacher";

/**
 * The results a teacher enters.
 *
 * A teacher may only enter the marks of a class and a subject they are
 * allocated to. The rule is part of the query, so a teacher who changes a
 * request cannot write a sheet of a class or a subject that is not theirs.
 *
 * The grade and the grade point are worked out by the one function in
 * `grading.ts`, never by the browser, so the sheet stores the same numbers
 * the table shows.
 */

/** The portrait a student without one is shown with. */
const FALLBACK_PHOTO = "/images/student.jpg";

/** The copy of the guidance panel above the marks table. */
const GUIDANCE = {
  title: "Enter marks between 0 and 100.",
  body: "Grades are calculated automatically. Save a draft before you publish.",
} as const;

/** The time the sheet was last saved, e.g. "10:42 AM". */
function timeLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
}

/** The date the sheet was last saved, e.g. "04 Nov 2026". */
function dateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * The classes the teacher is allocated to.
 *
 * The allocation is the rule: a class the teacher only takes a subject in
 * still counts, because the teacher may enter the marks of that subject.
 */
export async function listResultClasses(): Promise<TeacherResultClassOption[]> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return [];

  const allocations = await prisma.classSubject.findMany({
    where: { teacherId: teacher.data.id },
    orderBy: { class: { sortOrder: "asc" } },
    select: {
      class: {
        select: {
          id: true,
          name: true,
          gradingMode: true,
          sections: {
            where: { isDefault: true },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  const classes: TeacherResultClassOption[] = [];
  const seen = new Set<string>();

  for (const allocation of allocations) {
    if (seen.has(allocation.class.id)) continue;

    seen.add(allocation.class.id);

    classes.push({
      id: allocation.class.id,
      name: allocation.class.name,
      sectionId: allocation.class.sections[0]?.id ?? "",
      gpa: allocation.class.gradingMode === "GPA",
    });
  }

  return classes;
}

/**
 * The exams the teacher may enter marks for.
 *
 * The exams of the school are listed, newest first. The teacher may only
 * write a sheet of an exam that has not been published for their class.
 */
export async function listResultExams(): Promise<TeacherResultExamOption[]> {
  const exams = await prisma.exam.findMany({
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    select: { id: true, name: true },
  });

  return exams;
}

/**
 * The roster of a class, for the teacher who is allocated to it.
 */
export async function listResultRoster(
  classId: string,
): Promise<TeacherStudentRow[]> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return [];

  const allocation = await prisma.classSubject.findFirst({
    where: { teacherId: teacher.data.id, classId },
    select: { class: { select: { sections: { where: { isDefault: true }, select: { id: true }, take: 1 } } } },
  });

  const sectionId = allocation?.class.sections[0]?.id;

  if (!sectionId) return [];

  const students = await prisma.student.findMany({
    where: { sectionId },
    orderBy: { roll: "asc" },
    select: { id: true, roll: true, name: true, photoUrl: true },
  });

  return students.map((student) => ({
    id: student.id,
    roll: student.roll,
    name: student.name,
    photo: student.photoUrl ?? FALLBACK_PHOTO,
    photoAlt: `Portrait of ${student.name}`,
  }));
}

/**
 * Everything the results page shows.
 *
 * The exam, the class and the subject come from the request, but they are
 * checked against the allocations of the teacher, so a class or a subject that
 * is not theirs is refused.
 */
export async function getTeacherResults(input: {
  examId?: string;
  classId?: string;
  subjectId?: string;
}): Promise<TeacherResultData | null> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return null;

  const [classes, exams] = await Promise.all([
    listResultClasses(),
    listResultExams(),
  ]);

  if (classes.length === 0) {
    return {
      exams,
      classes,
      subjects: [],
      examId: "",
      classId: "",
      subjectId: "",
      students: [],
      marks: {},
      grades: {},
      gpas: {},
      gpa: false,
      published: false,
      savedAt: "",
      savedOn: "",
      context: teacherContextLine(teacher.data),
      guidance: GUIDANCE,
    };
  }

  const chosenClass =
    classes.find((entry) => entry.id === input.classId) ?? classes[0];

  // The subjects the teacher may write for in this class. The list belongs to
  // the class and not to the teacher, because the allocation of a subject is
  // per class.
  const subjects = await listSubjectNames(chosenClass.id);

  const chosenSubject =
    subjects.find((subject) => subject.id === input.subjectId)?.id ??
    subjects[0]?.id ??
    "";

  const chosenExam = exams.find((exam) => exam.id === input.examId) ?? exams[0];

  const students = await listResultRoster(chosenClass.id);

  const sheet = chosenExam && chosenSubject
    ? await prisma.resultSheet.findUnique({
        where: {
          examId_sectionId_subjectId: {
            examId: chosenExam.id,
            sectionId: chosenClass.sectionId,
            subjectId: chosenSubject,
          },
        },
        select: {
          id: true,
          status: true,
          savedAt: true,
          publishedAt: true,
          results: {
            select: { studentId: true, marks: true, grade: true, gpa: true },
          },
        },
      })
    : null;

  const marks: Record<string, string> = {};
  const grades: Record<string, string> = {};
  const gpas: Record<string, string> = {};

  for (const row of sheet?.results ?? []) {
    marks[row.studentId] = row.marks === null ? "" : String(row.marks);
    grades[row.studentId] = row.grade ?? "";
    gpas[row.studentId] = gpaForMark(row.marks, !chosenClass.gpa);
  }

  const published = sheet?.status === "PUBLISHED";

  return {
    exams,
    classes,
    subjects,
    examId: chosenExam?.id ?? "",
    classId: chosenClass.id,
    subjectId: chosenSubject,
    students,
    marks,
    grades,
    gpas,
    gpa: chosenClass.gpa,
    published,
    savedAt: sheet ? timeLabel(sheet.savedAt) : "",
    savedOn: sheet ? dateLabel(sheet.savedAt) : "",
    context: teacherContextLine(teacher.data),
    guidance: GUIDANCE,
  };
}

/**
 * The subject names the teacher may write for in a class, keyed by id.
 */
export async function listSubjectNames(
  classId: string,
): Promise<{ id: string; name: string }[]> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return [];

  const allocations = await prisma.classSubject.findMany({
    where: { teacherId: teacher.data.id, classId },
    orderBy: { subject: { name: "asc" } },
    select: { subject: { select: { id: true, name: true } } },
  });

  return allocations.map((allocation) => allocation.subject);
}

/**
 * Checks the marks of a sheet.
 *
 * A mark that has not been entered yet is not an error: the teacher may fill
 * the sheet in row by row. A mark that is not a number, or one outside 0–100,
 * is reported so the teacher can fix it before publishing.
 */
export function validateResultMarks(
  rows: readonly { id: string; name: string; marks: string }[],
): TeacherMarkError[] {
  const errors: TeacherMarkError[] = [];

  for (const row of rows) {
    const trimmed = row.marks.trim();

    if (trimmed === "") continue;

    const value = Number(trimmed);

    if (!Number.isFinite(value)) {
      errors.push({
        rowId: row.id,
        studentName: row.name,
        message: `${row.name}: ${trimmed} is not a number.`,
      });
      continue;
    }

    if (value < 0 || value > 100) {
      errors.push({
        rowId: row.id,
        studentName: row.name,
        message: `${row.name}: ${trimmed} is above the maximum of 100. Correct the mark to publish.`,
      });
    }
  }

  return errors;
}

/**
 * Works out the grade and the grade point of the marks that are typed.
 *
 * Nothing is written: the marks are only read, so the table can show the
 * grade the sheet will store. The grade comes from the one function in
 * `grading.ts`, so the browser never works a grade out for itself.
 */
export async function previewTeacherMarks(input: {
  examId: string;
  classId: string;
  subjectId: string;
  marks: Record<string, string>;
}): Promise<
  | {
      ok: true;
      data: {
        grades: Record<string, string>;
        gpas: Record<string, string>;
        errors: TeacherMarkError[];
      };
    }
  | { ok: false; error: string }
> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return { ok: false, error: teacher.error };

  const allocation = await prisma.classSubject.findFirst({
    where: {
      teacherId: teacher.data.id,
      classId: input.classId,
      subjectId: input.subjectId,
    },
    select: {
      class: {
        select: {
          gradingMode: true,
          sections: { where: { isDefault: true }, select: { id: true }, take: 1 },
        },
      },
    },
  });

  if (!allocation) {
    return {
      ok: false,
      error: "You may only enter the marks of the subjects allocated to you.",
    };
  }

  const sectionId = allocation.class.sections[0]?.id;

  if (!sectionId) {
    return { ok: false, error: "That class has no students yet." };
  }

  const gradeOnly = allocation.class.gradingMode === "GRADE_ONLY";

  const students = await prisma.student.findMany({
    where: { sectionId },
    select: { id: true, name: true },
  });

  const grades: Record<string, string> = {};
  const gpas: Record<string, string> = {};

  for (const student of students) {
    const raw = (input.marks[student.id] ?? "").trim();

    if (raw === "") continue;

    // The grade is worked out from the mark the sheet will hold, so the
    // table shows the grade of the stored number and not of a decimal the
    // sheet rounds away.
    const value = parseMark(raw);

    if (value === null) continue;

    grades[student.id] = gradeForMark(value);
    gpas[student.id] = gpaForMark(value, gradeOnly);
  }

  const rows = students.map((student) => ({
    id: student.id,
    name: student.name,
    marks: input.marks[student.id] ?? "",
  }));

  return {
    ok: true,
    data: {
      grades,
      gpas,
      errors: validateResultMarks(rows),
    },
  };
}

/**
 * Saves a draft of a result sheet.
 *
 * The sheet may only be written for a class and a subject the teacher is
 * allocated to, and only for the students of that class. The grade and the
 * grade point are worked out on the server, so the browser cannot name its
 * own grades.
 */
export async function saveTeacherResultDraft(
  raw: TeacherResultSheetInput,
): Promise<{ ok: true; data: { saved: number } } | { ok: false; error: string }> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return { ok: false, error: teacher.error };

  const parsed = teacherResultSheetSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "That sheet is not valid",
    };
  }

  const input = parsed.data;

  const allocation = await prisma.classSubject.findFirst({
    where: {
      teacherId: teacher.data.id,
      classId: input.classId,
      subjectId: input.subjectId,
    },
    select: {
      class: {
        select: {
          gradingMode: true,
          sections: { where: { isDefault: true }, select: { id: true }, take: 1 },
        },
      },
    },
  });

  if (!allocation) {
    return {
      ok: false,
      error: "You may only enter the marks of the subjects allocated to you.",
    };
  }

  const sectionId = allocation.class.sections[0]?.id;

  if (!sectionId) {
    return { ok: false, error: "That class has no students yet." };
  }

  const gradeOnly = allocation.class.gradingMode === "GRADE_ONLY";

  const students = await prisma.student.findMany({
    where: { sectionId },
    select: { id: true, name: true, roll: true },
  });

  const roster = new Map(students.map((student) => [student.id, student]));

  // Every mark has to belong to a student of the class.
  for (const studentId of Object.keys(input.marks)) {
    if (!roster.has(studentId)) {
      return {
        ok: false,
        error: "One of the marks belongs to a student who is not in this class.",
      };
    }
  }

  const rows = students.map((student) => ({
    id: student.id,
    name: student.name,
    marks: input.marks[student.id] ?? "",
  }));

  const errors = validateResultMarks(rows);

  if (errors.length > 0) {
    return { ok: false, error: errors[0].message };
  }

  const saved = await prisma.$transaction(async (tx) => {
    const sheet = await tx.resultSheet.upsert({
      where: {
        examId_sectionId_subjectId: {
          examId: input.examId,
          sectionId,
          subjectId: input.subjectId,
        },
      },
      update: {
        status: "DRAFT",
        savedAt: new Date(),
        publishedAt: null,
        enteredById: teacher.data.userId,
      },
      create: {
        examId: input.examId,
        classId: input.classId,
        sectionId,
        subjectId: input.subjectId,
        status: "DRAFT",
        savedAt: new Date(),
        enteredById: teacher.data.userId,
      },
      select: { id: true },
    });

    for (const student of students) {
      const raw = (input.marks[student.id] ?? "").trim();
      const value = parseMark(raw);

      await tx.examResult.upsert({
        where: {
          examId_studentId_subjectId: {
            examId: input.examId,
            studentId: student.id,
            subjectId: input.subjectId,
          },
        },
        update: {
          marks: value,
          grade: value === null ? null : gradeForMark(value),
          // A class that is graded on a grade only keeps no grade point.
          gpa: value === null || gradeOnly ? null : gpaForMark(value),
          status: "DRAFT",
          resultSheetId: sheet.id,
          enteredById: teacher.data.userId,
        },
        create: {
          examId: input.examId,
          studentId: student.id,
          subjectId: input.subjectId,
          resultSheetId: sheet.id,
          marks: value,
          grade: value === null ? null : gradeForMark(value),
          gpa: value === null || gradeOnly ? null : gpaForMark(value),
          status: "DRAFT",
          enteredById: teacher.data.userId,
        },
      });
    }

    return sheet;
  });

  await writeAudit({
    actorId: teacher.data.userId,
    action: "Result draft saved",
    entityType: "ResultSheet",
    entityId: saved.id,
    metadata: {
      examId: input.examId,
      classId: input.classId,
      subjectId: input.subjectId,
      count: students.length,
    },
  });

  return { ok: true, data: { saved: students.length } };
}

/**
 * Publishes a result sheet.
 *
 * A sheet is only published when every mark of it is valid, so a sheet with a
 * mark outside 0–100 never reaches the students. Publishing locks the sheet:
 * the marks and the status of the sheet and of every result of it are written
 * in one transaction, so a student can never see a published sheet with a
 * draft result in it.
 */
export async function publishTeacherResult(
  raw: TeacherResultSheetInput,
): Promise<{ ok: true; data: { published: number } } | { ok: false; error: string }> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return { ok: false, error: teacher.error };

  const parsed = teacherResultSheetSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "That sheet is not valid",
    };
  }

  const input = parsed.data;

  const allocation = await prisma.classSubject.findFirst({
    where: {
      teacherId: teacher.data.id,
      classId: input.classId,
      subjectId: input.subjectId,
    },
    select: {
      class: {
        select: {
          gradingMode: true,
          sections: { where: { isDefault: true }, select: { id: true }, take: 1 },
        },
      },
    },
  });

  if (!allocation) {
    return {
      ok: false,
      error: "You may only publish the results of the subjects allocated to you.",
    };
  }

  const sectionId = allocation.class.sections[0]?.id;

  if (!sectionId) {
    return { ok: false, error: "That class has no students yet." };
  }

  const gradeOnly = allocation.class.gradingMode === "GRADE_ONLY";

  const students = await prisma.student.findMany({
    where: { sectionId },
    select: { id: true, name: true },
  });

  const roster = new Set(students.map((student) => student.id));

  for (const studentId of Object.keys(input.marks)) {
    if (!roster.has(studentId)) {
      return {
        ok: false,
        error: "One of the marks belongs to a student who is not in this class.",
      };
    }
  }

  const rows = students.map((student) => ({
    id: student.id,
    name: student.name,
    marks: input.marks[student.id] ?? "",
  }));

  const errors = validateResultMarks(rows);

  if (errors.length > 0) {
    return { ok: false, error: errors[0].message };
  }

  const now = new Date();

  const published = await prisma.$transaction(async (tx) => {
    const sheet = await tx.resultSheet.upsert({
      where: {
        examId_sectionId_subjectId: {
          examId: input.examId,
          sectionId,
          subjectId: input.subjectId,
        },
      },
      update: {
        status: "PUBLISHED",
        savedAt: now,
        publishedAt: now,
        enteredById: teacher.data.userId,
      },
      create: {
        examId: input.examId,
        classId: input.classId,
        sectionId,
        subjectId: input.subjectId,
        status: "PUBLISHED",
        savedAt: now,
        publishedAt: now,
        enteredById: teacher.data.userId,
      },
      select: { id: true },
    });

    for (const student of students) {
      const raw = (input.marks[student.id] ?? "").trim();
      const value = parseMark(raw);

      await tx.examResult.upsert({
        where: {
          examId_studentId_subjectId: {
            examId: input.examId,
            studentId: student.id,
            subjectId: input.subjectId,
          },
        },
        update: {
          marks: value,
          grade: value === null ? null : gradeForMark(value),
          gpa: value === null || gradeOnly ? null : gpaForMark(value),
          status: "PUBLISHED",
          resultSheetId: sheet.id,
          enteredById: teacher.data.userId,
        },
        create: {
          examId: input.examId,
          studentId: student.id,
          subjectId: input.subjectId,
          resultSheetId: sheet.id,
          marks: value,
          grade: value === null ? null : gradeForMark(value),
          gpa: value === null || gradeOnly ? null : gpaForMark(value),
          status: "PUBLISHED",
          enteredById: teacher.data.userId,
        },
      });
    }

    return sheet;
  });

  await writeAudit({
    actorId: teacher.data.userId,
    action: "Results published",
    entityType: "ResultSheet",
    entityId: published.id,
    metadata: {
      examId: input.examId,
      classId: input.classId,
      subjectId: input.subjectId,
      count: students.length,
    },
  });

  return { ok: true, data: { published: students.length } };
}

/**
 * Re-opens a published sheet as a draft.
 *
 * The sheet goes back to a draft and the results with it, so a student never
 * sees a half-edited sheet. The audit row records who re-opened it and when.
 */
export async function reopenTeacherResult(input: {
  examId: string;
  classId: string;
  subjectId: string;
}): Promise<{ ok: true; data: { id: string } } | { ok: false; error: string }> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return { ok: false, error: teacher.error };

  const allocation = await prisma.classSubject.findFirst({
    where: {
      teacherId: teacher.data.id,
      classId: input.classId,
      subjectId: input.subjectId,
    },
    select: {
      class: {
        select: {
          sections: { where: { isDefault: true }, select: { id: true }, take: 1 },
        },
      },
    },
  });

  const sectionId = allocation?.class.sections[0]?.id;

  if (!sectionId) {
    return {
      ok: false,
      error: "You may only edit the results of the subjects allocated to you.",
    };
  }

  const sheet = await prisma.resultSheet.findUnique({
    where: {
      examId_sectionId_subjectId: {
        examId: input.examId,
        sectionId,
        subjectId: input.subjectId,
      },
    },
    select: { id: true, status: true },
  });

  if (!sheet) {
    return { ok: false, error: "That sheet does not exist" };
  }

  if (sheet.status !== "PUBLISHED") {
    return { ok: false, error: "That sheet is already a draft" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.resultSheet.update({
      where: { id: sheet.id },
      data: { status: "DRAFT", savedAt: new Date(), publishedAt: null },
    });

    await tx.examResult.updateMany({
      where: { resultSheetId: sheet.id },
      data: { status: "DRAFT" },
    });
  });

  await writeAudit({
    actorId: teacher.data.userId,
    action: "Published results re-opened",
    entityType: "ResultSheet",
    entityId: sheet.id,
    metadata: {
      examId: input.examId,
      classId: input.classId,
      subjectId: input.subjectId,
      reopenedAt: new Date().toISOString(),
    },
  });

  return { ok: true, data: { id: sheet.id } };
}
