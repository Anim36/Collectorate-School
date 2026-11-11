import { prisma } from "@/server/db";
import { formatPoisha } from "@/lib/money";
import { currentStudent } from "@/server/services/student-identity";
import { getAttendanceTrend } from "@/server/services/student-attendance";
import {
  countStudentNoticesSince,
  listStudentNotices,
} from "@/server/services/student-content";
import type { StudentDashboardData } from "@/types/student";

/**
 * The dashboard of the signed-in student.
 *
 * Every figure is counted by the database, so the numbers the page shows are
 * the numbers the school holds and not a second count made in the browser.
 */

/**
 * The attendance of the student over the whole record, counted by the
 * database.
 */
async function attendanceRate(
  studentId: string,
): Promise<{ rate: string; hint: string }> {
  const row = await prisma.attendance.groupBy({
    by: ["status"],
    where: { studentId },
    _count: { _all: true },
  });

  const countOf = (status: string) =>
    row.find((entry) => entry.status === status)?._count._all ?? 0;

  const present = countOf("PRESENT");
  const absent = countOf("ABSENT");
  const late = countOf("LATE");

  const schoolDays = present + absent + late;
  const attended = present + late;

  return {
    rate:
      schoolDays === 0
        ? "0.0%"
        : `${((attended / schoolDays) * 100).toFixed(1)}%`,
    hint: "This academic term",
  };
}

/**
 * The grade point of the latest published exam, counted by the database.
 */
async function lastGpa(
  studentId: string,
): Promise<{ value: string; hint: string }> {
  const exam = await prisma.exam.findFirst({
    where: {
      published: true,
      results: { some: { studentId, status: "PUBLISHED" } },
    },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    select: {
      name: true,
      results: {
        where: { studentId, status: "PUBLISHED" },
        select: { gpa: true },
      },
    },
  });

  if (!exam) {
    return { value: "—", hint: "No published result yet" };
  }

  const points = exam.results
    .map((row) => (row.gpa === null ? null : Number(row.gpa.toString())))
    .filter((value): value is number => value !== null);

  if (points.length === 0) {
    return { value: "—", hint: exam.name };
  }

  const average =
    points.reduce((sum, value) => sum + value, 0) / points.length;

  return { value: average.toFixed(2), hint: exam.name };
}

/**
 * The fees the student still owes, counted by the database.
 *
 * A line that waits for the admin is not owed yet, because the payment that
 * settles it has not been approved: it is left out of the total and the line
 * shows as "Pending verification" instead.
 */
async function feeDue(
  studentId: string,
): Promise<{ value: string; hint: string }> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const fees = await prisma.fee.findMany({
    where: { studentId, status: { not: "PAID" } },
    orderBy: { dueDate: "asc" },
    select: {
      id: true,
      amountPoisha: true,
      dueDate: true,
      payments: {
        where: { payment: { status: "PENDING" } },
        select: { paymentId: true },
        take: 1,
      },
    },
  });

  const outstanding = fees.filter((fee) => fee.payments.length === 0);

  if (outstanding.length === 0) {
    return { value: formatPoisha(0), hint: "All dues cleared" };
  }

  const total = outstanding.reduce((sum, fee) => sum + fee.amountPoisha, 0);
  const next = outstanding[0];

  const due = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(next.dueDate);

  return { value: formatPoisha(total), hint: `Due ${due}` };
}

/**
 * Everything the student dashboard shows.
 */
export async function getStudentDashboard(): Promise<StudentDashboardData | null> {
  const student = await currentStudent();

  if (!student) return null;

  const [attendance, gpa, fee, trend, notices] = await Promise.all([
    attendanceRate(student.id),
    lastGpa(student.id),
    feeDue(student.id),
    getAttendanceTrend(6),
    listStudentNotices(),
  ]);

  // The notices that arrived since the student's last visit are counted
  // separately, because the recent list is capped while the count is not.
  const newNotices = await countStudentNoticesSince(student.lastVisitedAt);

  // The visit is recorded after the count has been made, so the notices that
  // were just counted are the ones that are still new on the next visit.
  await prisma.student.update({
    where: { id: student.id },
    data: { lastVisitedAt: new Date() },
  });

  const now = new Date();

  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(now);

  const greeting = {
    headline: `${greetingHeadline(now)}, ${firstName(student.name)}.`,
    context: `${student.className} · Roll ${student.roll}  /  ${today}`,
  };

  return {
    greeting,
    metrics: [
      { label: "Attendance", value: attendance.rate, hint: attendance.hint },
      { label: "Last GPA", value: gpa.value, hint: gpa.hint },
      { label: "Fee due", value: fee.value, hint: fee.hint },
      {
        label: "New notices",
        value: String(newNotices),
        hint: "Since your last visit",
      },
    ],
    attendanceTrend: trend,
    notices: notices.slice(0, 3),
  };
}

/**
 * The greeting of the day, e.g. "Good afternoon".
 *
 * The name of the student is added by the caller, so the greeting never
 * names a student the session does not belong to.
 */
function greetingHeadline(now: Date): string {
  const hour = now.getUTCHours();

  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/**
 * The first name of the student, which is what the greeting calls them.
 */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
