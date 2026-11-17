import type { Metadata } from "next";

import { TeacherNotice } from "@/components/teacher/teacher-notice";
import { getTeacherNotices } from "@/server/services/teacher-content";

export const metadata: Metadata = {
  title: "Notice",
  description: "Read the notices addressed to teachers, students and everyone.",
};

/**
 * Teacher notice board.
 * Figma "Teacher / Notice" (2:8753 desktop, 2:8899 tablet, 2:9013 mobile and
 * the matching dark frames): the audience filter and the notices table.
 *
 * The notices are read from the database, and only the published ones that
 * are addressed to the teachers, to the students or to the public are read.
 */
export default async function TeacherNoticePage() {
  const board = await getTeacherNotices();

  return <TeacherNotice initial={board} />;
}
