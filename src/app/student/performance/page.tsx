import type { Metadata } from "next";

import { StudentPerformance } from "@/components/student/student-performance";
import { getStudentPerformance } from "@/server/services/student-results";

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
export default async function StudentPerformancePage() {
  // The marks come from the published results of the signed-in student.
  const performance = await getStudentPerformance();

  if (!performance) {
    return null;
  }

  return <StudentPerformance data={performance} />;
}
