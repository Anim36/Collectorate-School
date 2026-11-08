import type { Metadata } from "next";

import { StudentResult } from "@/components/student/student-result";

export const metadata: Metadata = {
  title: "Result",
  description: "Your subject marks, grades and GPA for every exam.",
};

/**
 * Student result page.
 * Figma "Student / Result" (2:4907 desktop, 2:5012 tablet, 2:5099 mobile and
 * the matching dark frames): the exam selector, the marks table, the overall
 * GPA card and the download button.
 */
export default function StudentResultPage() {
  return <StudentResult />;
}
