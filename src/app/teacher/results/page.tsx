import type { Metadata } from "next";

import { TeacherResults } from "@/components/teacher/teacher-results";
import { getTeacherResults } from "@/server/services/teacher-results";

export const metadata: Metadata = {
  title: "Results",
  description: "Enter, validate and publish the marks of your classes.",
};

interface TeacherResultsPageProps {
  /** The exam, the class and the subject the reader picked. */
  searchParams: Promise<{ exam?: string; class?: string; subject?: string }>;
}

/**
 * Teacher result entry.
 * Figma "Teacher / Result Update" (2:7828 desktop, 2:8006 tablet, 2:8152
 * mobile and the matching dark frames): the selection filters, the guidance
 * panel, the editable marks table and the save and publish actions. The
 * validation frame (2:8286) shows the same page with a mark outside 0–100.
 */
export default async function TeacherResultsPage({
  searchParams,
}: TeacherResultsPageProps) {
  const { exam: examId, class: classId, subject: subjectId } = await searchParams;

  // The exam, the class and the subject are only a request: the server works
  // out what the teacher may write, and refuses the rest.
  const results = await getTeacherResults({ examId, classId, subjectId });

  if (!results) {
    return null;
  }

  return <TeacherResults initial={results} />;
}
