import { prisma } from "@/server/db";
import { writeAudit } from "@/server/services/audit";
import {
  requireTeacher,
  teacherContextLine,
} from "@/server/services/teacher-identity";
import {
  TEACHER_ATTENDANCE_EDIT_WINDOW_DAYS,
  teacherAttendanceSheetSchema,
  type TeacherAttendanceSheetInput,
} from "@/server/services/teacher-schemas";
import type {
  TeacherAttendanceData,
  TeacherAttendanceHistoryRow,
  TeacherAttendanceMark,
  TeacherAttendanceSheet,
  TeacherAttendanceStatus,
  TeacherClassOption,
  TeacherStudentRow,
} from "@/types/teacher";

/**
 * The attendance the teacher takes.
 *
 * A teacher may only take the attendance of the classes they are the class
 * teacher of. The rule is part of the query, not of the interface, so a
 * teacher who changes a request cannot mark a class that is not theirs.
 */

/** The portrait a student without one is shown with. */
const FALLBACK_PHOTO = "/images/student.jpg";

/** The date the school treats as today, at midnight. */
function today(): Date {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now;
}

/** A date as the school writes it, e.g. "2026-11-04". */
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** A date the way the tables show it, e.g. "04 Nov 2026". */
function dateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** A time the way the tables show it, e.g. "09:12 AM". */
function timeLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
}

/** The mark a row of the database carries. */
function statusOf(status: string): TeacherAttendanceStatus {
  switch (status) {
    case "ABSENT":
      return "absent";
    case "LATE":
      return "late";
    default:
      return "present";
  }
}

/**
 * The classes the teacher is the class teacher of.
 *
 * The rule is part of the query: the section has to name this teacher, so a
 * class the teacher only teaches a subject in never appears here.
 */
export async function listTeacherClasses(): Promise<TeacherClassOption[]> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return [];

  const sections = await prisma.section.findMany({
    where: { classTeacherId: teacher.data.id },
    orderBy: { class: { sortOrder: "asc" } },
    select: {
      id: true,
      class: { select: { id: true, name: true } },
    },
  });

  return sections.map((section) => ({
    id: section.class.id,
    name: section.class.name,
    sectionId: section.id,
  }));
}

/**
 * The roll of a class.
 *
 * The class has to be one the teacher is the class teacher of, so the roll of
 * another class is never read.
 */
export async function listClassRoll(
  classId: string,
): Promise<TeacherStudentRow[]> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return [];

  const section = await prisma.section.findFirst({
    where: { classTeacherId: teacher.data.id, class: { id: classId } },
    select: { id: true },
  });

  if (!section) return [];

  const students = await prisma.student.findMany({
    where: { sectionId: section.id },
    orderBy: { roll: "asc" },
    select: {
      id: true,
      roll: true,
      name: true,
      photoUrl: true,
    },
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
 * Whether a teacher may still edit a sheet of a day.
 *
 * A sheet may be edited on the day it was marked and on the days after it,
 * up to the window. A day in the future is never editable.
 */
export function isWithinEditWindow(date: Date, now = today()): boolean {
  if (date.getTime() > now.getTime()) return false;

  const oldest = new Date(now);
  oldest.setUTCDate(oldest.getUTCDate() - TEACHER_ATTENDANCE_EDIT_WINDOW_DAYS);
  oldest.setUTCHours(0, 0, 0, 0);

  return date.getTime() >= oldest.getTime();
}

/**
 * The sheet of a class on a day, with the marks that are saved.
 */
async function readSheet(
  classId: string,
  date: Date,
): Promise<{
  sheet: TeacherAttendanceSheet | null;
  marks: Record<string, TeacherAttendanceStatus>;
  savedAt: Date | null;
}> {
  const section = await prisma.section.findFirst({
    where: { class: { id: classId } },
    select: { id: true, class: { select: { name: true } } },
  });

  if (!section) {
    return { sheet: null, marks: {}, savedAt: null };
  }

  const [saved, rows] = await Promise.all([
    prisma.attendanceSheet.findUnique({
      where: { sectionId_date: { sectionId: section.id, date } },
      select: { id: true, savedAt: true },
    }),
    prisma.attendance.findMany({
      where: { sectionId: section.id, date },
      select: { studentId: true, status: true },
    }),
  ]);

  const marks: Record<string, TeacherAttendanceStatus> = {};

  for (const row of rows) {
    marks[row.studentId] = statusOf(row.status);
  }

  const now = today();

  return {
    sheet: {
      id: saved?.id ?? `sheet-${isoDate(date)}-${section.id}`,
      classId,
      className: section.class.name,
      date: isoDate(date),
      dateLabel: dateLabel(date),
      marks,
      savedAt: saved ? timeLabel(saved.savedAt) : "",
      saved: saved !== null,
      editable: isWithinEditWindow(date, now),
    },
    marks,
    savedAt: saved?.savedAt ?? null,
  };
}

/**
 * The saved sheets of the classes of the teacher, newest first.
 */
export async function listAttendanceHistory(
  classId?: string,
  month?: string,
): Promise<TeacherAttendanceHistoryRow[]> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return [];

  const sections = await prisma.section.findMany({
    where: {
      classTeacherId: teacher.data.id,
      ...(classId ? { class: { id: classId } } : {}),
    },
    select: {
      id: true,
      class: { select: { id: true, name: true } },
    },
  });

  if (sections.length === 0) return [];

  const now = today();

  const sectionIds = sections.map((section) => section.id);

  // The month the reader picked, e.g. "2026-11". An empty month shows every
  // sheet the teacher has.
  const monthStart = month ? new Date(`${month}-01T00:00:00.000Z`) : null;
  const monthEnd = monthStart
    ? new Date(
        Date.UTC(
          monthStart.getUTCFullYear(),
          monthStart.getUTCMonth() + 1,
          1,
        ),
      )
    : null;

  const [sheets, grouped] = await Promise.all([
    prisma.attendanceSheet.findMany({
      where: {
        sectionId: { in: sectionIds },
        ...(monthStart && monthEnd
          ? { date: { gte: monthStart, lt: monthEnd } }
          : {}),
      },
      orderBy: [{ date: "desc" }, { sectionId: "asc" }],
      select: {
        id: true,
        date: true,
        savedAt: true,
        sectionId: true,
        section: { select: { class: { select: { id: true, name: true } } } },
      },
    }),
    // The counts of every sheet in one query, so the history does not ask the
    // database once per row.
    prisma.attendance.groupBy({
      by: ["sectionId", "date", "status"],
      where: {
        sectionId: { in: sectionIds },
        ...(monthStart && monthEnd
          ? { date: { gte: monthStart, lt: monthEnd } }
          : {}),
      },
      _count: { _all: true },
    }),
  ]);

  // The counts of every sheet, keyed by the section and the day.
  const countsBySheet = new Map<string, { present: number; absent: number; late: number }>();

  for (const entry of grouped) {
    const key = `${entry.sectionId}|${isoDate(entry.date)}`;
    const counts = countsBySheet.get(key) ?? { present: 0, absent: 0, late: 0 };

    if (entry.status === "ABSENT") counts.absent += entry._count._all;
    else if (entry.status === "LATE") counts.late += entry._count._all;
    else counts.present += entry._count._all;

    countsBySheet.set(key, counts);
  }

  return sheets.map((sheet) => {
    const counts = countsBySheet.get(`${sheet.sectionId}|${isoDate(sheet.date)}`) ?? {
      present: 0,
      absent: 0,
      late: 0,
    };

    return {
      id: sheet.id,
      classId: sheet.section.class.id,
      className: sheet.section.class.name,
      date: isoDate(sheet.date),
      dateLabel: dateLabel(sheet.date),
      present: counts.present,
      absent: counts.absent,
      late: counts.late,
      status: "Saved",
      editable: isWithinEditWindow(sheet.date, now),
    };
  });
}

/**
 * The months the teacher has sheets in, newest first.
 *
 * The list is read from every sheet of the teacher and not from the page that
 * is open, so the month filter still offers the other months after one of them
 * has been picked.
 */
export async function listAttendanceMonths(): Promise<string[]> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return [];

  const sections = await prisma.section.findMany({
    where: { classTeacherId: teacher.data.id },
    select: { id: true },
  });

  if (sections.length === 0) return [];

  const sheets = await prisma.attendanceSheet.findMany({
    where: { sectionId: { in: sections.map((section) => section.id) } },
    select: { date: true },
  });

  const months = new Set<string>();

  for (const sheet of sheets) {
    months.add(isoDate(sheet.date).slice(0, 7));
  }

  return [...months].sort().reverse();
}

/**
 * Everything the attendance page shows.
 *
 * The class and the day come from the request, but they are checked against
 * the classes of the teacher, so a class that is not theirs is refused.
 */
export async function getTeacherAttendance(input: {
  classId?: string;
  date?: string;
  historyClassId?: string;
  historyMonth?: string;
}): Promise<TeacherAttendanceData | null> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return null;

  const classes = await listTeacherClasses();

  if (classes.length === 0) {
    return {
      classes: [],
      students: [],
      sheet: null,
      history: [],
      months: [],
      today: isoDate(today()),
      editable: false,
      lockedReason: "You are not the class teacher of any class yet.",
      context: teacherContextLine(teacher.data),
    };
  }

  const now = today();

  // The class the reader asked for, or the first class of the teacher.
  const chosen =
    classes.find((entry) => entry.id === input.classId) ?? classes[0];

  // The day the reader asked for, or today.
  const date = parseDate(input.date) ?? now;

  const [students, history, read, months] = await Promise.all([
    listClassRoll(chosen.id),
    listAttendanceHistory(input.historyClassId, input.historyMonth),
    readSheet(chosen.id, date),
    listAttendanceMonths(),
  ]);

  const editable = isWithinEditWindow(date, now);

  return {
    classes,
    students,
    sheet: read.sheet,
    history,
    months,
    today: isoDate(now),
    editable,
    lockedReason: editable
      ? ""
      : date.getTime() > now.getTime()
        ? "A sheet cannot be marked for a day that has not come yet."
        : `A sheet can only be edited on the day it was marked and for ${TEACHER_ATTENDANCE_EDIT_WINDOW_DAYS} days after it.`,
    context: teacherContextLine(teacher.data, now),
  };
}

/**
 * Saves the attendance of a class on a day.
 *
 * Every student of the class has to be marked exactly once, the day may not be
 * in the future, and the sheet may only be edited inside the window. The
 * marks and the sheet are written in one transaction, so a sheet never exists
 * without its marks.
 *
 * Saving the same sheet twice changes nothing: the rows are written on their
 * own key, so the second save replaces the first.
 */
export async function saveTeacherAttendance(
  raw: TeacherAttendanceSheetInput,
): Promise<
  | { ok: true; data: { present: number; absent: number; late: number; total: number } }
  | { ok: false; error: string }
> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return { ok: false, error: teacher.error };

  const parsed = teacherAttendanceSheetSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "That sheet is not valid",
    };
  }

  const input = parsed.data;

  const section = await prisma.section.findFirst({
    where: { classTeacherId: teacher.data.id, class: { id: input.classId } },
    select: { id: true },
  });

  if (!section) {
    return {
      ok: false,
      error: "You may only mark the attendance of your own class.",
    };
  }

  const date = parseDate(input.date);

  if (!date) {
    return { ok: false, error: "Choose a valid date" };
  }

  const now = today();

  if (date.getTime() > now.getTime()) {
    return { ok: false, error: "A sheet cannot be marked for a day that has not come yet." };
  }

  if (!isWithinEditWindow(date, now)) {
    return {
      ok: false,
      error: `A sheet can only be edited on the day it was marked and for ${TEACHER_ATTENDANCE_EDIT_WINDOW_DAYS} days after it.`,
    };
  }

  // The roll of the class: every mark has to belong to it, and every student
  // of it has to be marked exactly once.
  const students = await prisma.student.findMany({
    where: { sectionId: section.id },
    select: { id: true },
  });

  const roster = new Set(students.map((student) => student.id));

  const seen = new Set<string>();
  const marks: TeacherAttendanceMark[] = [];

  for (const mark of input.marks) {
    if (!roster.has(mark.studentId)) {
      return {
        ok: false,
        error: "One of the marks belongs to a student who is not in this class.",
      };
    }

    if (seen.has(mark.studentId)) {
      return {
        ok: false,
        error: "One of the students is marked twice.",
      };
    }

    seen.add(mark.studentId);
    marks.push(mark);
  }

  if (marks.length !== roster.size) {
    return {
      ok: false,
      error: `Mark every student of the class: ${marks.length} of ${roster.size} are marked.`,
    };
  }

  const counts = { present: 0, absent: 0, late: 0, total: marks.length };

  for (const mark of marks) {
    if (mark.status === "absent") counts.absent += 1;
    else if (mark.status === "late") counts.late += 1;
    else counts.present += 1;
  }

  const saved = await prisma.$transaction(async (tx) => {
    // The sheet itself. The row is upserted on its own key, so saving twice
    // changes the save time and nothing else.
    const sheet = await tx.attendanceSheet.upsert({
      where: { sectionId_date: { sectionId: section.id, date } },
      update: { markedById: teacher.data.userId, savedAt: new Date() },
      create: {
        sectionId: section.id,
        date,
        markedById: teacher.data.userId,
        savedAt: new Date(),
      },
      select: { id: true, savedAt: true },
    });

    // The marks. They are written one row at a time on the key of the
    // student and the day, so a student can only have one mark on a day.
    for (const mark of marks) {
      await tx.attendance.upsert({
        where: { studentId_date: { studentId: mark.studentId, date } },
        update: {
          status: mark.status === "absent" ? "ABSENT" : mark.status === "late" ? "LATE" : "PRESENT",
          sectionId: section.id,
          markedById: teacher.data.userId,
        },
        create: {
          studentId: mark.studentId,
          sectionId: section.id,
          date,
          status:
            mark.status === "absent"
              ? "ABSENT"
              : mark.status === "late"
                ? "LATE"
                : "PRESENT",
          markedById: teacher.data.userId,
        },
      });
    }

    return sheet;
  });

  await writeAudit({
    actorId: teacher.data.userId,
    action: "Attendance sheet saved",
    entityType: "AttendanceSheet",
    entityId: saved.id,
    metadata: {
      classId: input.classId,
      date: input.date,
      present: counts.present,
      absent: counts.absent,
      late: counts.late,
      total: counts.total,
    },
  });

  return { ok: true, data: counts };
}

/**
 * A date the school reads, or null when the date is not one.
 */
function parseDate(value: string | undefined): Date | null {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );

  // A day that does not exist, e.g. the 31st of February, is refused.
  if (date.getUTCDate() !== Number(day)) return null;

  return date;
}
