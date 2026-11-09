import type { Metadata } from "next";

import { PortalLayout } from "@/components/layout/portal-layout";
import { requireRole } from "@/server/auth-guard";
import { studentNav } from "@/data/portal-navigation";

export const metadata: Metadata = {
  title: "Student portal",
};

/**
 * Student portal shell.
 * Figma "Student / Dashboard" (2:3613 desktop, 2:3718 tablet, 2:3805 mobile).
 */
export default async function StudentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The row is re-read from the database on every request, so a deactivated
  // account or a session that has been superseded is refused here.
  const user = await requireRole("STUDENT");

  return (
    <PortalLayout
      nav={studentNav}
      userName={user.name}
      userPhoto={user.photoUrl ?? "/images/student.jpg"}
      userPhotoAlt={user.photoAlt ?? `Portrait of ${user.name}`}
    >
      {children}
    </PortalLayout>
  );
}
