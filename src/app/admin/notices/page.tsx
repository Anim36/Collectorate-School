import type { Metadata } from "next";

import { AdminNotices } from "@/components/admin/admin-notices";

export const metadata: Metadata = {
  title: "Notices",
  description: "Write a notice, choose who sees it and publish it to the school.",
};

/**
 * Admin notices.
 * Figma "Admin / Notices" (2:11912 desktop, 2:12070 tablet, 2:12189 mobile and
 * the matching dark frames): the notice list and the notice editor.
 */
export default function AdminNoticesPage() {
  return <AdminNotices />;
}
