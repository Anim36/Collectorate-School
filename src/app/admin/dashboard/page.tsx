import type { Metadata } from "next";

import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin dashboard",
  description: "Your school at a glance: students, teachers, fees and what needs attention.",
};

/**
 * Admin dashboard.
 * Figma "Admin / Dashboard" (2:9503 desktop, 2:9700 tablet, 2:9858 mobile and
 * the matching dark frames): the metric row, the fee collection chart, the
 * "Attention needed" table and the "Recent activity" table.
 */
export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
