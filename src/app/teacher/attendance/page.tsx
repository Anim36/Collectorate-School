import type { Metadata } from "next";

import { TeacherAttendance } from "@/components/teacher/teacher-attendance";
import { getTeacherAttendance } from "@/server/services/teacher-attendance";

export const metadata: Metadata = {
  title: "Attendance",
  description: "Mark the attendance of your classes and review past sheets.",
};

interface TeacherAttendancePageProps {
  /** The class and the day the reader picked. */
  searchParams: Promise<{ class?: string; date?: string }>;
}

/**
 * Teacher attendance sheet.
 * Figma "Teacher / Attendance Sheet" (2:6847 desktop, 2:7061 tablet, 2:7243
 * mobile and the matching dark frames): the selection filters, the counters,
 * the marking table and the save action. The History tab shows the saved
 * sheets.
 */
export default async function TeacherAttendancePage({
  searchParams,
}: TeacherAttendancePageProps) {
  const { class: classId, date } = await searchParams;

  // The class and the day are only a request: the server works out which
  // classes the teacher may mark, and refuses the rest.
  const attendance = await getTeacherAttendance({ classId, date });

  if (!attendance) {
    return null;
  }

  return <TeacherAttendance initial={attendance} />;
}
