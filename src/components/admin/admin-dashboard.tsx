import { AdminActivityTable, AdminAttentionTable } from "@/components/admin/admin-dashboard-tables";
import { AdminFeeChart } from "@/components/admin/admin-fee-chart";
import { AdminMetrics } from "@/components/admin/admin-metrics";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import type { AdminDashboardData } from "@/types/admin-11c";

export interface AdminDashboardProps {
  /** Everything the dashboard shows, read from the database. */
  data: AdminDashboardData;
  /** The context line under the heading. */
  greeting: string;
}

/**
 * Admin dashboard body.
 *
 * Figma "Dashboard content" (2:9549 desktop, 2:9707 tablet, 2:9863 mobile
 * and the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px greeting, the 166px metric row, the
 *   385px fee chart, the 308px "Attention needed" table and the 308px "Recent
 *   activity" table.
 * - Tablet (768): 32px padding; the blocks keep their heights.
 * - Mobile (375): 24px padding and a 111px greeting. The metric row becomes
 *   two rows of two cards, and each table row becomes a stacked record.
 *
 * Every figure comes from the database: the counts are counts of rows, the
 * money is an integer number of poisha, and the recent activity is the audit
 * log.
 */
export function AdminDashboard({ data, greeting }: AdminDashboardProps) {
  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <AdminPageHeader title="Your school, at a glance." description={greeting} />

      <AdminMetrics metrics={data.metrics} />

      <AdminFeeChart months={data.months} />

      <h3 className="text-title font-bold leading-[1.45] text-ink">
        Attention needed
      </h3>

      <AdminAttentionTable rows={data.attention} />

      <h3 className="text-title font-bold leading-[1.45] text-ink">
        Recent activity
      </h3>

      <AdminActivityTable rows={data.activity} />
    </div>
  );
}
