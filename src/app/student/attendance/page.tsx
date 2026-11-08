import type { Metadata } from "next";

import { StudentAttendance } from "@/components/student/student-attendance";

export const metadata: Metadata = {
  title: "Attendance",
  description: "Your monthly attendance record, day by day.",
};

/**
 * Student attendance page.
 * Figma "Student / Attendance" (2:4129 desktop, 2:4305 tablet, 2:4463 mobile
 * and the matching dark frames): the month selector, the summary counts and
 * the attendance calendar.
 */
export default function StudentAttendancePage() {
  return <StudentAttendance />;
}
