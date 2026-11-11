import type { Metadata } from "next";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { listDashboardAction } from "@/app/admin/actions";
import { adminGreetingContext } from "@/server/services/admin-context";

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
export default async function AdminDashboardPage() {
  // Every figure comes from the database: the counts are counts of rows, the
  // money is an integer number of poisha and the recent activity is the audit
  // log.
  const [dashboard, greeting] = await Promise.all([
    listDashboardAction(),
    adminGreetingContext(),
  ]);

  return (
    <AdminDashboard
      data={
        dashboard.ok
          ? dashboard.data
          : { metrics: [], months: [], attention: [], activity: [] }
      }
      greeting={greeting}
    />
  );
}
