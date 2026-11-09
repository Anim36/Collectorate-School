import type { Metadata } from "next";

import { PortalLayout } from "@/components/layout/portal-layout";
import { requireRole } from "@/server/auth-guard";
import { adminNav } from "@/data/portal-navigation";

export const metadata: Metadata = {
  title: "Admin portal",
};

/**
 * Admin portal shell.
 * Figma "Admin / Dashboard" (2:9503 desktop, 2:9700 tablet, 2:9858 mobile).
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The row is re-read from the database on every request, so a deactivated
  // account or a session that has been superseded is refused here.
  const user = await requireRole("ADMIN");

  return (
    <PortalLayout
      nav={adminNav}
      userName={user.name}
      userPhoto={user.photoUrl ?? "/images/head-of-institution.jpg"}
      userPhotoAlt={user.photoAlt ?? `Portrait of ${user.name}`}
    >
      {children}
    </PortalLayout>
  );
}
