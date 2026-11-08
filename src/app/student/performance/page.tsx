import type { Metadata } from "next";

import { StudentPerformance } from "@/components/student/student-performance";

export const metadata: Metadata = {
  title: "Performance",
  description: "Your marks over time and how you are doing subject by subject.",
};

/**
 * Student performance page.
 * Figma "Student / Performance" (2:4620 desktop, 2:4728 tablet, 2:4818 mobile
 * and the matching dark frames): the metric row, the marks chart, the
 * subject-wise bars and the strength notes.
 */
export default function StudentPerformancePage() {
  return <StudentPerformance />;
}
