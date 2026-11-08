import type { Metadata } from "next";

import { StudentDashboard } from "@/components/student/student-dashboard";

export const metadata: Metadata = {
  title: "Student dashboard",
  description: "Your attendance, results, fees and notices at a glance.",
};

/**
 * Student dashboard.
 * Figma "Student / Dashboard" (2:3613 desktop, 2:3718 tablet, 2:3805 mobile
 * and the matching dark frames): a greeting, the welcome panel, four key
 * metrics, the attendance trend chart and the recent-notices table.
 */
export default function StudentDashboardPage() {
  return <StudentDashboard />;
}
