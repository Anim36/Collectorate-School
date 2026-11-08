import type { Metadata } from "next";

import { PortalLayout } from "@/components/layout/portal-layout";
import { studentNav } from "@/data/portal-navigation";

export const metadata: Metadata = {
  title: "Student portal",
};

/**
 * Student portal shell.
 * Figma "Student / Dashboard" (2:3613 desktop, 2:3718 tablet, 2:3805 mobile).
 */
export default function StudentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PortalLayout
      nav={studentNav}
      userName="Arif Hasan"
      userPhoto="/images/student.jpg"
      userPhotoAlt="Portrait of Arif Hasan"
    >
      {children}
    </PortalLayout>
  );
}
