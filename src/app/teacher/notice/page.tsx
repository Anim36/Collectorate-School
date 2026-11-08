import type { Metadata } from "next";

import { TeacherNotice } from "@/components/teacher/teacher-notice";

export const metadata: Metadata = {
  title: "Notice",
  description: "Read the notices addressed to teachers, students and everyone.",
};

/**
 * Teacher notice board.
 * Figma "Teacher / Notice" (2:8753 desktop, 2:8899 tablet, 2:9013 mobile and
 * the matching dark frames): the audience filter and the notices table.
 */
export default function TeacherNoticePage() {
  return <TeacherNotice />;
}
