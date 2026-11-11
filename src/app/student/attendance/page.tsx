import type { Metadata } from "next";

import { StudentAttendance } from "@/components/student/student-attendance";
import {
  getAttendanceMonth,
  listAttendanceMonths,
} from "@/server/services/student-attendance";
import { attendanceMonthSchema } from "@/server/services/student-schemas";

export const metadata: Metadata = {
  title: "Attendance",
  description: "Your monthly attendance record, day by day.",
};

interface StudentAttendancePageProps {
  /** The month the reader picked, as `yyyy-mm`. */
  searchParams: Promise<{ month?: string }>;
}

/**
 * Student attendance page.
 * Figma "Student / Attendance" (2:4129 desktop, 2:4305 tablet, 2:4463 mobile
 * and the matching dark frames): the month selector, the summary counts and
 * the attendance calendar.
 */
export default async function StudentAttendancePage({
  searchParams,
}: StudentAttendancePageProps) {
  const { month } = await searchParams;

  // The months and the days are read for the student the session belongs to,
  // so the calendar can only ever show their own record. The month is only
  // the month that is looked at: the student never comes from the browser.
  const months = await listAttendanceMonths();

  const parsed = attendanceMonthSchema.safeParse(month ?? "");

  const selected =
    parsed.success &&
    months.some(
      (entry) => `${entry.year}-${entry.month}` === parsed.data,
    )
      ? parsed.data
      : "";

  const [year, monthNumber] = selected
    ? selected.split("-").map(Number)
    : [months[0]?.year ?? 0, months[0]?.month ?? 0];

  const record =
    year && monthNumber ? await getAttendanceMonth(year, monthNumber) : null;

  return <StudentAttendance months={months} initial={record} />;
}
