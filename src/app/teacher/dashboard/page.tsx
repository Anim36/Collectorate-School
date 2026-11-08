import type { Metadata } from "next";

import { TeacherDashboard } from "@/components/teacher/teacher-dashboard";

export const metadata: Metadata = {
  title: "Teacher dashboard",
};

/**
 * Teacher dashboard.
 * Figma "Teacher / Dashboard" (2:6341 desktop, 2:6537 tablet, 2:6701 mobile
 * and the matching dark frames): the teaching-plan panel, the metric row, the
 * classes table, today's attendance and the recent notices.
 */
export default function TeacherDashboardPage() {
  return <TeacherDashboard />;
}
