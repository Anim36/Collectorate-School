import type { Metadata } from "next";

import { PortalLayout } from "@/components/layout/portal-layout";
import { requireRole } from "@/server/auth-guard";
import { teacherNav } from "@/data/portal-navigation";

export const metadata: Metadata = {
  title: "Teacher portal",
};

/**
 * Teacher portal shell.
 * Figma "Teacher / Dashboard" (2:6341 desktop, 2:6537 tablet, 2:6701 mobile).
 */
export default async function TeacherLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The row is re-read from the database on every request, so a deactivated
  // account or a session that has been superseded is refused here.
  const user = await requireRole("TEACHER");

  return (
    <PortalLayout
      nav={teacherNav}
      userName={user.name}
      userPhoto={user.photoUrl ?? "/images/teacher.jpg"}
      userPhotoAlt={user.photoAlt ?? `Portrait of ${user.name}`}
    >
      {children}
    </PortalLayout>
  );
}
