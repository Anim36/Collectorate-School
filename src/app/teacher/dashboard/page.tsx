import type { Metadata } from "next";

import { TeacherDashboard } from "@/components/teacher/teacher-dashboard";
import { getTeacherDashboard } from "@/server/services/teacher-dashboard";

export const metadata: Metadata = {
  title: "Teacher dashboard",
};

/**
 * Teacher dashboard.
 * Figma "Teacher / Dashboard" (2:6341 desktop, 2:6537 tablet, 2:6701 mobile
 * and the matching dark frames): the teaching-plan panel, the metric row, the
 * classes table, today's attendance and the recent notices.
 */
export default async function TeacherDashboardPage() {
  // Every figure comes from the database, and the teacher behind them is
  // worked out from the session on the server.
  const dashboard = await getTeacherDashboard();

  if (!dashboard) {
    return null;
  }

  return <TeacherDashboard data={dashboard} />;
}
