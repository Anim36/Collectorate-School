import type { Metadata } from "next";

import { StudentNotice } from "@/components/student/student-notice";
import { getStudentNoticeBoard } from "@/server/services/student-content";
import { studentNoticeFilterSchema } from "@/server/services/student-schemas";

export const metadata: Metadata = {
  title: "Notice",
  description: "Every notice published for you by the school.",
};

interface StudentNoticePageProps {
  /** The filters the reader picked, carried in the query string. */
  searchParams: Promise<{
    query?: string;
    category?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

/**
 * Student notice board.
 * Figma "Student / Notice" (2:5442 desktop, 2:5512 tablet, 2:5564 mobile and
 * the matching dark frames): the results table with a category filter, a
 * search box and a date range.
 *
 * The notices are read from the database and are the published ones that are
 * addressed to students or to the public. A draft notice is never read.
 */
export default async function StudentNoticePage({
  searchParams,
}: StudentNoticePageProps) {
  const params = await searchParams;

  // The filters are read from the query string, but they are checked before
  // they reach the database, so a tampered parameter cannot widen the search.
  const filters = studentNoticeFilterSchema.safeParse({
    query: params.query,
    category: params.category,
    from: params.from,
    to: params.to,
    page: Number(params.page ?? 0),
  });

  const board = await getStudentNoticeBoard(
    filters.success ? filters.data : { page: 0 },
  );

  return <StudentNotice board={board} />;
}
