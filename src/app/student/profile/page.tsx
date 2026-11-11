import type { Metadata } from "next";

import { StudentProfileCard } from "@/components/student/student-profile-card";
import { getStudentProfile } from "@/server/services/student-profile";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Your student identity, class, guardian and contact details.",
};

/**
 * Student profile page.
 * Figma "Student / My Profile" (2:3887 desktop, 2:3979 tablet, 2:4053 mobile
 * and the matching dark frames).
 */
export default async function StudentProfilePage() {
  // The row is read for the student the session belongs to, so there is no
  // id the browser could change to reach another student's details.
  const profile = await getStudentProfile();

  if (!profile) {
    return null;
  }

  return <StudentProfileCard profile={profile} />;
}
