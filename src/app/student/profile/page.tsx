import type { Metadata } from "next";

import { StudentProfileCard } from "@/components/student/student-profile-card";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Your student identity, class, guardian and contact details.",
};

/**
 * Student profile page.
 * Figma "Student / My Profile" (2:3887 desktop, 2:3979 tablet, 2:4053 mobile
 * and the matching dark frames).
 */
export default function StudentProfilePage() {
  return <StudentProfileCard />;
}
