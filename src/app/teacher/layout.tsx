import type { Metadata } from "next";

import { PortalLayout } from "@/components/layout/portal-layout";
import { teacherNav } from "@/data/portal-navigation";

export const metadata: Metadata = {
  title: "Teacher portal",
};

/**
 * Teacher portal shell.
 * Figma "Teacher / Dashboard" (2:6341 desktop, 2:6537 tablet, 2:6701 mobile).
 */
export default function TeacherLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PortalLayout
      nav={teacherNav}
      userName="Nusrat Jahan"
      userPhoto="/images/teacher.jpg"
      userPhotoAlt="Portrait of Nusrat Jahan"
    >
      {children}
    </PortalLayout>
  );
}
