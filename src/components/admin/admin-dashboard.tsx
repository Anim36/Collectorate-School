import { AdminActivityTable, AdminAttentionTable } from "@/components/admin/admin-dashboard-tables";
import { AdminFeeChart } from "@/components/admin/admin-fee-chart";
import { AdminMetrics } from "@/components/admin/admin-metrics";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminActivityRows,
  adminAttentionRows,
  adminFeeMonths,
  adminGreeting,
  adminMetrics,
} from "@/data/admin";

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
 */
export function AdminDashboard() {
  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <AdminPageHeader
        title={adminGreeting.headline}
        description={adminGreeting.context}
      />

      <AdminMetrics metrics={adminMetrics} />

      <AdminFeeChart months={adminFeeMonths} />

      <h3 className="text-title font-bold leading-[1.45] text-ink">
        Attention needed
      </h3>

      <AdminAttentionTable rows={adminAttentionRows} />

      <h3 className="text-title font-bold leading-[1.45] text-ink">
        Recent activity
      </h3>

      <AdminActivityTable rows={adminActivityRows} />
    </div>
  );
}
