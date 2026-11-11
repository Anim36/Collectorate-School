import type { Metadata } from "next";

import { StudentResult } from "@/components/student/student-result";
import {
  getStudentExamResult,
  listStudentExams,
} from "@/server/services/student-results";

export const metadata: Metadata = {
  title: "Result",
  description: "Your subject marks, grades and GPA for every exam.",
};

interface StudentResultPageProps {
  /** The exam the reader picked, as the id of the exam. */
  searchParams: Promise<{ exam?: string }>;
}

/**
 * Student result page.
 * Figma "Student / Result" (2:4907 desktop, 2:5012 tablet, 2:5099 mobile
 * and the matching dark frames): the exam selector, the marks table, the
 * overall GPA card and the download button.
 */
export default async function StudentResultPage({
  searchParams,
}: StudentResultPageProps) {
  const { exam } = await searchParams;

  // The exams and the marks come from the published results of the student
  // the session belongs to. The exam id is only the exam that is looked at:
  // the marks of another student are never read, because the service carries
  // the student in the query.
  const exams = await listStudentExams();

  const selected =
    exam && exams.some((entry) => entry.id === exam) ? exam : exams[0]?.id ?? "";

  const result = selected ? await getStudentExamResult(selected) : null;

  return <StudentResult exams={exams} initial={result} />;
}
