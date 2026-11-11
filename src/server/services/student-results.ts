import { prisma } from "@/server/db";
import { currentStudent } from "@/server/services/student-identity";
import type {
  StudentExamOption,
  StudentExamResult,
  StudentPerformanceData,
  StudentPerformancePoint,
  StudentResultRow,
  StudentSubjectMark,
} from "@/types/student";

/**
 * The results of the signed-in student.
 *
 * Only published results are ever read: a sheet that is still a draft is
 * not the student's to see, so it is filtered out by the database rather
 * than by the page.
 */

/**
 * The grade point of a row, as the table shows it.
 *
 * The stored value is the one that is shown, so a grade a teacher entered
 * is never recomputed here. The column is a decimal, so it is read as a
 * number before it is written out.
 */
function gradePointOf(gpa: { toString(): string } | null): string {
  if (gpa === null) return "";

  return Number(gpa.toString()).toFixed(2);
}

/**
 * The grade point of a row, as a number.
 */
function gradePointNumber(gpa: { toString(): string } | null): number | null {
  if (gpa === null) return null;

  return Number(gpa.toString());
}

/**
 * The published exams of the student, newest first.
 */
export async function listStudentExams(): Promise<StudentExamOption[]> {
  const student = await currentStudent();

  if (!student) return [];

  const exams = await prisma.exam.findMany({
    where: {
      published: true,
      results: {
        some: { studentId: student.id, status: "PUBLISHED" },
      },
    },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    select: { id: true, name: true },
  });

  return exams.map((exam) => ({
    id: exam.id,
    label: exam.name,
    gradeOnly: student.gradeOnly,
  }));
}

/**
 * The result of the student in one exam.
 *
 * The marks are the stored ones: the grade, the grade point and the marks
 * come out of the row the teacher wrote.
 */
export async function getStudentExamResult(
  examId: string,
): Promise<StudentExamResult | null> {
  const student = await currentStudent();

  if (!student) return null;

  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      published: true,
      results: {
        some: { studentId: student.id, status: "PUBLISHED" },
      },
    },
    select: {
      id: true,
      name: true,
      results: {
        where: { studentId: student.id, status: "PUBLISHED" },
        orderBy: { subject: { name: "asc" } },
        select: {
          marks: true,
          grade: true,
          gpa: true,
          subject: { select: { name: true } },
        },
      },
    },
  });

  if (!exam) return null;

  const rows: StudentResultRow[] = exam.results.map((row) => ({
    subject: row.subject.name,
    // A class that is graded on grades only shows no marks at all.
    marks: student.gradeOnly || row.marks === null ? "" : String(row.marks),
    grade: row.grade ?? "—",
    gpa: student.gradeOnly ? "" : gradePointOf(row.gpa),
  }));

  const marked = exam.results.filter((row) => row.marks !== null);
  const total = marked.reduce((sum, row) => sum + (row.marks ?? 0), 0);
  const maximum = marked.length * 100;

  const points = exam.results
    .map((row) => gradePointNumber(row.gpa))
    .filter((value): value is number => value !== null);

  const average =
    points.length === 0
      ? 0
      : points.reduce((sum, value) => sum + value, 0) / points.length;

  return {
    id: exam.id,
    label: exam.name,
    rows,
    gpa: student.gradeOnly ? "—" : `${average.toFixed(2)} / 5.00`,
    totalMarks: student.gradeOnly
      ? `Graded on ${rows.length} subjects`
      : `Total marks: ${total} / ${maximum}`,
    outcome: `Passed all ${rows.length} subjects`,
    gradeOnly: student.gradeOnly,
  };
}

/**
 * The marks of the student over the exams that were published.
 */
export async function getPerformanceTrend(): Promise<StudentPerformancePoint[]> {
  const student = await currentStudent();

  if (!student) return [];

  const exams = await prisma.exam.findMany({
    where: {
      published: true,
      results: { some: { studentId: student.id, status: "PUBLISHED" } },
    },
    orderBy: [{ year: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      term: true,
      results: {
        where: { studentId: student.id, status: "PUBLISHED" },
        select: { marks: true },
      },
    },
  });

  return exams.map((exam) => {
    const marks = exam.results
      .map((row) => row.marks)
      .filter((mark): mark is number => mark !== null);

    const average =
      marks.length === 0
        ? 0
        : marks.reduce((sum, mark) => sum + mark, 0) / marks.length;

    return {
      label: exam.term ?? exam.name,
      value: Math.round(average),
    };
  });
}

/**
 * The marks of the student, subject by subject.
 *
 * The subject-wise figures come from the latest published exam, so the
 * bars show what the student last sat.
 */
export async function getSubjectMarks(): Promise<StudentSubjectMark[]> {
  const student = await currentStudent();

  if (!student) return [];

  const latest = await prisma.exam.findFirst({
    where: {
      published: true,
      results: { some: { studentId: student.id, status: "PUBLISHED" } },
    },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      results: {
        where: { studentId: student.id, status: "PUBLISHED" },
        orderBy: { subject: { name: "asc" } },
        select: {
          marks: true,
          subject: { select: { name: true } },
        },
      },
    },
  });

  if (!latest) return [];

  return latest.results
    .filter((row) => row.marks !== null)
    .map((row) => ({
      subject: row.subject.name,
      mark: row.marks ?? 0,
    }));
}

/**
 * The subjects the student is strongest in and the ones that need work.
 *
 * The two lists are worked out from the stored marks, so the notes follow
 * the data rather than a fixed copy.
 */
export async function getPerformanceNotes(): Promise<{
  strength: { title: string; body: string };
  growth: { title: string; body: string };
}> {
  const marks = await getSubjectMarks();

  return performanceNotesFor(marks);
}

/**
 * The notes for a set of subject marks.
 *
 * They are worked out from the stored marks, so the notes follow the data
 * rather than a fixed copy. The marks are passed in, so a caller that already
 * holds them does not read the same rows twice.
 */
export function performanceNotesFor(
  marks: readonly StudentSubjectMark[],
): {
  strength: { title: string; body: string };
  growth: { title: string; body: string };
} {
  if (marks.length === 0) {
    return {
      strength: {
        title: "Your strength",
        body: "Your published results will appear here once an exam is published.",
      },
      growth: {
        title: "Room to grow",
        body: "Your published results will appear here once an exam is published.",
      },
    };
  }

  const sorted = [...marks].sort((a, b) => b.mark - a.mark);

  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  return {
    strength: {
      title: "Your strength",
      body: `${strongest.subject} · Strong performance with ${strongest.mark} out of 100.`,
    },
    growth: {
      title: "Room to grow",
      body: `${weakest.subject} · Short daily revision sessions will close the gap.`,
    },
  };
}

/**
 * The average grade point of the latest published exam.
 */
async function lastGpa(
  studentId: string,
): Promise<{ value: string; hint: string }> {
  const exam = await prisma.exam.findFirst({
    where: {
      published: true,
      results: { some: { studentId, status: "PUBLISHED" } },
    },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    select: {
      name: true,
      results: {
        where: { studentId, status: "PUBLISHED" },
        select: { gpa: true },
      },
    },
  });

  if (!exam) {
    return { value: "—", hint: "No published result yet" };
  }

  const points = exam.results
    .map((row) => gradePointNumber(row.gpa))
    .filter((value): value is number => value !== null);

  if (points.length === 0) {
    return { value: "—", hint: exam.name };
  }

  const average =
    points.reduce((sum, value) => sum + value, 0) / points.length;

  return { value: average.toFixed(2), hint: exam.name };
}

/**
 * Everything the performance page shows.
 *
 * Every figure is worked out from the published marks of the student, so
 * the chart, the bars and the notes all follow the same rows.
 */
export async function getStudentPerformance(): Promise<StudentPerformanceData | null> {
  const student = await currentStudent();

  if (!student) return null;

  const [trend, marks, gpa] = await Promise.all([
    getPerformanceTrend(),
    getSubjectMarks(),
    lastGpa(student.id),
  ]);

  // The notes are worked out from the marks that were just read, so the
  // strength and the growth always follow the same rows as the bars.
  const notes = performanceNotesFor(marks);

  const average =
    marks.length === 0
      ? 0
      : marks.reduce((sum, mark) => sum + mark.mark, 0) / marks.length;

  const best = [...marks].sort((a, b) => b.mark - a.mark)[0] ?? null;

  // The growth is the difference between the first and the last exam the
  // student sat, so it follows the published results.
  const first = trend[0]?.value ?? 0;
  const last = trend[trend.length - 1]?.value ?? 0;
  const growth = last - first;

  return {
    metrics: [
      {
        label: "Average",
        value: marks.length === 0 ? "—" : `${Math.round(average)}%`,
        hint: "Across all subjects",
      },
      {
        label: "Best subject",
        value: best ? best.subject : "—",
        hint: best ? `${best.mark} / 100` : "No result published yet",
      },
      {
        label: "Growth",
        value: `${growth >= 0 ? "+" : ""}${growth}%`,
        hint: "Since first term",
      },
      { label: "Last GPA", value: gpa.value, hint: gpa.hint },
    ],
    trend,
    marks,
    notes,
  };
}
