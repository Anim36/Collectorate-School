import type { Metadata } from "next";

import { StudentNotice } from "@/components/student/student-notice";

export const metadata: Metadata = {
  title: "Notice",
  description: "Every notice published for you by the school.",
};

/**
 * Student notice board.
 * Figma "Student / Notice" (2:5442 desktop, 2:5512 tablet, 2:5564 mobile and
 * the matching dark frames): the results table with a category filter, a
 * search box and a date range.
 */
export default function StudentNoticePage() {
  return <StudentNotice />;
}
