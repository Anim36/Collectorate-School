import type { Metadata } from "next";

import { PortalLayout } from "@/components/layout/portal-layout";
import { adminNav } from "@/data/portal-navigation";

export const metadata: Metadata = {
  title: "Admin portal",
};

/**
 * Admin portal shell.
 * Figma "Admin / Dashboard" (2:9503 desktop, 2:9700 tablet, 2:9858 mobile).
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PortalLayout
      nav={adminNav}
      userName="Rahim Uddin"
      userPhoto="/images/head-of-institution.jpg"
      userPhotoAlt="Portrait of Rahim Uddin"
    >
      {children}
    </PortalLayout>
  );
}
