import { prisma } from "@/server/db";
import { requireTeacher } from "@/server/services/teacher-identity";
import { countTeacherNoticesSince } from "@/server/services/teacher-content";
import type {
  TeacherAttendanceRow,
  TeacherClassRow,
  TeacherDashboardData,
  TeacherNoticeSummaryRow,
} from "@/types/teacher";

/**
 * The dashboard of the signed-in teacher.
 *
 * Every figure is counted by the database, so the numbers the page shows are
 * the numbers the school holds and not a second count made in the browser.
 * The counts are made in one query each, so the page never asks the database
 * once per row.
 */

/** The date the school treats as today, at midnight. */
function today(): Date {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now;
}

/** The short date the tables show, e.g. "04 Nov". */
function shortDate(date: Date | null): string {
  if (!date) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

/**
 * The greeting of the day, e.g. "Good morning".
 */
function greetingHeadline(now: Date): string {
  const hour = now.getUTCHours();

  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/**
 * The first name of the teacher, which is what the greeting calls them.
 */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/**
 * Everything the teacher dashboard shows.
 */
export async function getTeacherDashboard(): Promise<TeacherDashboardData | null> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return null;

  const now = today();

  // The classes of the teacher: the ones they are the class teacher of, and
  // the ones they take a subject in.
  const [sections, allocations] = await Promise.all([
    prisma.section.findMany({
      where: { classTeacherId: teacher.data.id },
      orderBy: { class: { sortOrder: "asc" } },
      select: {
        id: true,
        class: {
          select: {
            id: true,
            name: true,
            _count: { select: { students: true } },
          },
        },
      },
    }),
    prisma.classSubject.findMany({
      where: { teacherId: teacher.data.id },
      orderBy: { class: { sortOrder: "asc" } },
      select: {
        class: { select: { id: true, name: true } },
        subject: { select: { name: true } },
        teacherId: true,
      },
    }),
  ]);

  const classIds = new Set<string>();
  for (const section of sections) classIds.add(section.class.id);
  for (const allocation of allocations) classIds.add(allocation.class.id);

  // The subjects the teacher takes in each class, and the lesson of the day.
  const subjectOfClass = new Map<string, string>();
  for (const allocation of allocations) {
    if (!subjectOfClass.has(allocation.class.id)) {
      subjectOfClass.set(allocation.class.id, allocation.subject.name);
    }
  }

  const classNames = new Map<string, string>();
  const studentCounts = new Map<string, number>();

  for (const section of sections) {
    classNames.set(section.class.id, section.class.name);
    studentCounts.set(section.class.id, section.class._count.students);
  }

  for (const allocation of allocations) {
    if (!classNames.has(allocation.class.id)) {
      classNames.set(allocation.class.id, allocation.class.name);
      studentCounts.set(allocation.class.id, 0);
    }
  }

  // The lessons of the day, so the classes table shows the time and the room.
  const routinePeriods = await prisma.routinePeriod.findMany({
    where: {
      routine: { classId: { in: [...classIds] }, published: true },
      teacherId: teacher.data.id,
    },
    orderBy: [{ day: "asc" }, { period: "asc" }],
    select: {
      startTime: true,
      endTime: true,
      room: true,
      routine: { select: { classId: true } },
    },
  });

  const lessonOfClass = new Map<string, { time: string; room: string }>();

  for (const period of routinePeriods) {
    if (lessonOfClass.has(period.routine.classId)) continue;

    lessonOfClass.set(period.routine.classId, {
      time: `${period.startTime}–${period.endTime}`,
      room: period.room ?? "—",
    });
  }

  const classes: TeacherClassRow[] = [...classIds].map((classId) => {
    const lesson = lessonOfClass.get(classId);

    return {
      className: classNames.get(classId) ?? "",
      subject: subjectOfClass.get(classId) ?? "—",
      time: lesson?.time ?? "—",
      room: lesson?.room ?? "—",
    };
  });

  // The attendance of the day, per class, counted in one query.
  const sectionIds = sections.map((section) => section.id);

  const sheetsToday = await prisma.attendanceSheet.findMany({
    where: { sectionId: { in: sectionIds }, date: now },
    select: { sectionId: true },
  });

  const submitted = new Set(sheetsToday.map((sheet) => sheet.sectionId));

  const attendance: TeacherAttendanceRow[] = sections.map((section) => ({
    className: section.class.name,
    students: section.class._count.students,
    status: submitted.has(section.id) ? "Submitted" : "Pending",
  }));

  // The draft sheets of the teacher: the result entries that are still open.
  const pendingResults = await prisma.resultSheet.count({
    where: {
      status: "DRAFT",
      enteredById: teacher.data.userId,
    },
  });

  // The notices of the last seven days.
  const newNotices = await countTeacherNoticesSince();

  const recent = await prisma.notice.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ audience: { in: ["PUBLIC", "TEACHERS"] } }, { audiences: { hasSome: ["PUBLIC", "TEACHERS"] } }],
    },
    orderBy: [{ publishedOn: "desc" }, { createdAt: "desc" }],
    take: 2,
    select: { title: true, publishedOn: true },
  });

  const notices: TeacherNoticeSummaryRow[] = recent.map((notice) => ({
    date: shortDate(notice.publishedOn),
    notice: notice.title,
  }));

  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(now);

  const pendingSheets = attendance.filter((row) => row.status === "Pending").length;

  return {
    greeting: {
      headline: `${greetingHeadline(now)}, ${firstName(teacher.data.name)}.`,
      context: `${teacher.data.department}  /  ${todayLabel}`,
    },
    welcome: {
      title: "A good day to inspire.",
      body: `${classes.length} class${classes.length === 1 ? "" : "es"} today · ${pendingSheets} attendance sheet${pendingSheets === 1 ? "" : "s"} awaiting submission`,
      actionLabel: "Take attendance",
      actionHref: "/teacher/attendance",
    },
    metrics: [
      { label: "My classes", value: String(classes.length) },
      { label: "Attendance due", value: String(pendingSheets) },
      { label: "Result entries", value: String(pendingResults) },
      { label: "New notices", value: String(newNotices) },
    ],
    classes,
    attendance,
    notices,
  };
}
