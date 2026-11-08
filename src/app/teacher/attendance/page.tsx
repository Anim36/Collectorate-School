import type { Metadata } from "next";

import { TeacherAttendance } from "@/components/teacher/teacher-attendance";

export const metadata: Metadata = {
  title: "Attendance",
  description: "Mark the attendance of your classes and review past sheets.",
};

/**
 * Teacher attendance sheet.
 * Figma "Teacher / Attendance Sheet" (2:6847 desktop, 2:7061 tablet, 2:7243
 * mobile and the matching dark frames): the selection filters, the counters,
 * the marking table and the save action. The History tab shows the saved
 * sheets.
 */
export default function TeacherAttendancePage() {
  return <TeacherAttendance />;
}
