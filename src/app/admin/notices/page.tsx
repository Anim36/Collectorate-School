import type { Metadata } from "next";

import { AdminNotices } from "@/components/admin/admin-notices";
import { listNoticesAction } from "@/app/admin/actions";
import { NOTICE_CATEGORIES } from "@/server/services/admin-11b-schemas";

export const metadata: Metadata = {
  title: "Notices",
  description: "Write a notice, choose who sees it and publish it to the school.",
};

/**
 * Admin notices.
 * Figma "Admin / Notices" (2:11912 desktop, 2:12070 tablet, 2:12189 mobile and
 * the matching dark frames): the notice list and the notice editor.
 */
export default async function AdminNoticesPage() {
  // The notices come from the database, so the editor opens on a real notice
  // and the list holds what the school has really written.
  const notices = await listNoticesAction({ page: 0, pageSize: 10 });

  return (
    <AdminNotices
      initialNotices={notices.ok ? notices.data : null}
      categories={[...NOTICE_CATEGORIES]}
    />
  );
}
