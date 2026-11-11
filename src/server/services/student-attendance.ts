import { prisma } from "@/server/db";
import { currentStudent } from "@/server/services/student-identity";
import type {
  StudentAttendanceMonth,
  StudentAttendanceMonthOption,
  StudentAttendanceStatus,
  StudentAttendanceSummary,
  StudentAttendanceTrendPoint,
} from "@/types/student";

/**
 * The attendance of the signed-in student.
 *
 * Every count is made by the database, so the percentage the page shows is
 * the same number the database holds and not a number worked out again in
 * the browser.
 */

/** The state of a day, as the calendar shows it. */
function statusOf(status: string): StudentAttendanceStatus {
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
 * Counts the states of a month.
 *
 * The counts come straight from the grouped rows, so the rate is the rate
 * the database counted.
 */
function summarise(
  counts: { status: string; total: number }[],
): StudentAttendanceSummary {
  const countOf = (status: string) =>
    counts.find((entry) => entry.status === status)?.total ?? 0;

  const present = countOf("PRESENT");
  const absent = countOf("ABSENT");
  const late = countOf("LATE");

  const schoolDays = present + absent + late;
  const attended = present + late;

  return {
    present,
    absent,
    late,
    attended,
    schoolDays,
    rate:
      schoolDays === 0
        ? "0.0%"
        : `${((attended / schoolDays) * 100).toFixed(1)}%`,
  };
}

/** The first day of a month, at midnight. */
function startOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

/** The first day of the month after the one that is given. */
function startOfNextMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

/**
 * The months the student has attendance for, newest first.
 *
 * The months are worked out from the rows themselves, so the selector only
 * offers a month the school really marked.
 */
export async function listAttendanceMonths(): Promise<
  StudentAttendanceMonthOption[]
> {
  const student = await currentStudent();

  if (!student) return [];

  const rows = await prisma.attendance.findMany({
    where: { studentId: student.id },
    distinct: ["date"],
    orderBy: { date: "desc" },
    select: { date: true },
  });

  const months: StudentAttendanceMonthOption[] = [];

  for (const row of rows) {
    const year = row.date.getUTCFullYear();
    const month = row.date.getUTCMonth() + 1;

    if (months.some((entry) => entry.year === year && entry.month === month)) {
      continue;
    }

    months.push({
      year,
      month,
      label: new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(year, month - 1, 1))),
    });
  }

  return months;
}

/**
 * The attendance of the student in one month.
 *
 * The days are read for the student alone, so a month that belongs to
 * another student can never be read through this call.
 */
export async function getAttendanceMonth(
  year: number,
  month: number,
): Promise<StudentAttendanceMonth | null> {
  const student = await currentStudent();

  if (!student) return null;

  const from = startOfMonth(year, month);
  const to = startOfNextMonth(year, month);

  const [rows, grouped] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: student.id, date: { gte: from, lt: to } },
      orderBy: { date: "asc" },
      select: { date: true, status: true },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { studentId: student.id, date: { gte: from, lt: to } },
      _count: { _all: true },
    }),
  ]);

  return {
    year,
    month,
    days: rows.map((row) => ({
      day: row.date.getUTCDate(),
      status: statusOf(row.status),
    })),
    summary: summarise(
      grouped.map((entry) => ({
        status: entry.status,
        total: entry._count._all,
      })),
    ),
  };
}

/**
 * The attendance of the student over the last months.
 *
 * The rate of every month is counted by the database, so the bars of the
 * chart are the same numbers the attendance page shows.
 */
export async function getAttendanceTrend(
  monthCount = 6,
): Promise<StudentAttendanceTrendPoint[]> {
  const student = await currentStudent();

  if (!student) return [];

  const rows = await prisma.$queryRaw<
    {
      year: number;
      month: number;
      present: number;
      absent: number;
      late: number;
    }[]
  >`
    SELECT
      EXTRACT(YEAR FROM date)::int  AS year,
      EXTRACT(MONTH FROM date)::int AS month,
      COUNT(*) FILTER (WHERE status = 'PRESENT')::int AS present,
      COUNT(*) FILTER (WHERE status = 'ABSENT')::int  AS absent,
      COUNT(*) FILTER (WHERE status = 'LATE')::int    AS late
    FROM attendance
    WHERE student_id = ${student.id}
    GROUP BY year, month
    ORDER BY year ASC, month ASC
  `;

  if (rows.length === 0) return [];

  // The chart shows the last few months, so the oldest month drops off.
  const shown = rows.slice(-monthCount);

  return shown.map((row) => {
    const schoolDays = row.present + row.absent + row.late;
    const attended = row.present + row.late;
    const rate = schoolDays === 0 ? 0 : (attended / schoolDays) * 100;

    return {
      label: new Intl.DateTimeFormat("en-GB", {
        month: "short",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(row.year, row.month - 1, 1))),
      value: Math.round(rate),
      // The bar height follows the rate, so the chart reads the same way the
      // attendance page counts.
      barHeight: Math.max(8, Math.round((rate / 100) * 180)),
    };
  });
}
