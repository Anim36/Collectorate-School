import type { Metadata } from "next";

import { AdminAuditLog } from "@/components/admin/admin-audit-log";

export const metadata: Metadata = {
  title: "Audit Log",
  description:
    "Read the record of every change made to the accounts, results, attendance and fees of the school.",
};

/**
 * Admin audit log.
 * Figma "Admin / Audit Log" (2:14191 desktop, 2:14361 tablet, 2:14492 mobile
 * and the matching dark frames): the read-only log of the school's changes.
 */
export default function AdminAuditLogPage() {
  return <AdminAuditLog />;
}
