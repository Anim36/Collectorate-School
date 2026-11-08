import type { Metadata } from "next";

import { AdminUsers } from "@/components/admin/admin-users";

export const metadata: Metadata = {
  title: "Users",
  description: "The school accounts: search them, filter them and create new ones.",
};

/**
 * Admin users.
 * Figma "Admin / Users" (2:10002 desktop, 2:10180 tablet, 2:10319 mobile and
 * the matching dark frames), "Admin / Add User" (2:10445 / 2:10651 / 2:10818)
 * and "Admin / CSV import" (2:10972 / 2:11161 / 2:11311).
 */
export default function AdminUsersPage() {
  return <AdminUsers />;
}
