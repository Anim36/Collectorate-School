import type { Metadata } from "next";

import { TeacherResults } from "@/components/teacher/teacher-results";

export const metadata: Metadata = {
  title: "Results",
  description: "Enter, validate and publish the marks of your classes.",
};

/**
 * Teacher result entry.
 * Figma "Teacher / Result Update" (2:7828 desktop, 2:8006 tablet, 2:8152
 * mobile and the matching dark frames): the selection filters, the guidance
 * panel, the editable marks table and the save and publish actions. The
 * validation frame (2:8286) shows the same page with a mark outside 0–100.
 */
export default function TeacherResultsPage() {
  return <TeacherResults />;
}
