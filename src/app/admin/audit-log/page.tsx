import type { Metadata } from "next";

import { AdminAuditLog } from "@/components/admin/admin-audit-log";
import { listAuditLogAction } from "@/app/admin/actions";
import { adminGreetingContext } from "@/server/services/admin-context";

export const metadata: Metadata = {
  title: "Audit Log",
  description: "Who changed what in the school, and when.",
};

/**
 * Admin audit log.
 * Figma "Admin / Audit Log" (2:14191 desktop, 2:14361 tablet, 2:14492 mobile
 * and the matching dark frames): the search and the action-type filter, the
 * read-only log and the export action.
 */
export default async function AdminAuditLogPage() {
  // The events come from the database, so the log holds what really happened
  // and the count in the footer is the number of events that match.
  const [events, greeting] = await Promise.all([
    listAuditLogAction({ page: 0, pageSize: 4 }),
    adminGreetingContext(),
  ]);

  return (
    <AdminAuditLog
      initialEvents={
        events.ok
          ? { rows: events.data.rows, total: events.data.total }
          : null
      }
      greeting={greeting}
    />
  );
}
