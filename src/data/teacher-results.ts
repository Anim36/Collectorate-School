/**
 * Teacher result-entry mock data.
 *
 * Copy, order and counts mirror the Figma "Teacher / Result Update"
 * (light 2:7828 desktop, 2:8006 tablet, 2:8152 mobile) and
 * "Teacher / Result validation" (light 2:8286 desktop, 2:8467 tablet,
 * 2:8616 mobile) frames, plus the matching dark frames.
 */

/** Students shown on one page of the marks table. */
export const TEACHER_RESULT_PAGE_SIZE = 5;

/** The status of a result sheet. */
export type TeacherResultStatus = "Draft" | "Published";

/** The class and section pair used by the result filters. */
export interface TeacherResultClass {
  /** Class identifier, matching `TeacherClass.id`. */
  readonly id: string;
  /** Section letter. */
  readonly section: string;
}

/**
 * The class and section pairs offered by the result filter.
 * Figma shows "Class 9 · A" as the default selection.
 */
export const teacherResultClasses: readonly TeacherResultClass[] = [
  { id: "class-9", section: "A" },
  { id: "class-9", section: "B" },
  { id: "class-8", section: "A" },
  { id: "class-8", section: "B" },
  { id: "class-10", section: "A" },
];

/** The label of a class and section pair, e.g. "Class 9 · A". */
export function teacherResultClassLabel(
  classId: string,
  section: string,
): string {
  return `${classId.replace("class-", "Class ")} · ${section}`;
}

/** The subjects a teacher can enter marks for. */
export const teacherResultSubjects = [
  "Science",
  "Physics",
  "Chemistry",
  "Mathematics",
] as const;

/** A student's mark on a result sheet. */
export interface TeacherResultRow {
  /** Stable identifier of the student. */
  readonly id: string;
  /** Roll number shown in the marks table. */
  readonly roll: number;
  /** Student name. */
  readonly name: string;
  /**
   * The mark entered for the student.
   * A student whose mark has not been entered yet carries an empty string.
   */
  readonly marks: string;
}

/** A result sheet the teacher is working on. */
export interface TeacherResultSheet {
  /** Stable identifier of the sheet. */
  readonly id: string;
  /** Exam the sheet belongs to. */
  readonly exam: string;
  /** Class the sheet belongs to. */
  readonly classId: string;
  /** Section of the sheet. */
  readonly section: string;
  /** Subject the sheet belongs to. */
  readonly subject: string;
  /** Marks of the sheet, keyed by student id. */
  readonly marks: Readonly<Record<string, string>>;
  /** Whether the sheet is a draft or already published. */
  readonly status: TeacherResultStatus;
  /** Time the draft was last saved, e.g. "10:42 AM". */
  readonly savedAt: string;
}

/**
 * The sheets behind the exam selector.
 *
 * Figma "Result Update" (2:7968) shows the annual exam of Class 9 · A in
 * Science with the marks 88, 82, 76, 91 and 79 and the grades A+, A+, A, A+
 * and A. The half-yearly exam of the same class is already published, so it
 * opens read-only.
 */
export const teacherResultSheets: readonly TeacherResultSheet[] = [
  {
    id: "result-annual-2026-class-9-a-science",
    exam: "Annual exam 2026",
    classId: "class-9",
    section: "A",
    subject: "Science",
    status: "Draft",
    savedAt: "10:42 AM",
    marks: {
      "class-9-A-12": "88",
      "class-9-A-13": "82",
      "class-9-A-14": "76",
      "class-9-A-15": "91",
      "class-9-A-16": "79",
    },
  },
  {
    id: "result-half-yearly-2026-class-9-a-science",
    exam: "Half-yearly exam 2026",
    classId: "class-9",
    section: "A",
    subject: "Science",
    status: "Published",
    savedAt: "09:15 AM",
    marks: {
      "class-9-A-12": "84",
      "class-9-A-13": "78",
      "class-9-A-14": "86",
      "class-9-A-15": "81",
      "class-9-A-16": "73",
    },
  },
  {
    id: "result-class-test-3-class-9-a-science",
    exam: "Class test 3",
    classId: "class-9",
    section: "A",
    subject: "Science",
    status: "Draft",
    savedAt: "08:30 AM",
    marks: {},
  },
];

/** The exams the teacher can enter marks for. */
export const teacherExams: readonly string[] = teacherResultSheets.map(
  (sheet) => sheet.exam,
);

/** The copy of the guidance panel above the marks table. */
export const teacherResultGuidance = {
  title: "Enter marks between 0 and 100.",
  body: "Grades are calculated automatically. Save a draft before you publish.",
} as const;

/** The copy shown under the action buttons of a draft sheet. */
export const teacherResultDraftNote = "Draft saved · 04 Nov 2026, 10:42 AM";

/** The copy shown under the action buttons of a published sheet. */
export const teacherResultPublishedNote =
  "Published · 04 Nov 2026, 10:42 AM";

/** The copy shown under the action buttons when the sheet has errors. */
export const teacherResultBlockedNote =
  "Publishing is unavailable until errors are resolved.";

/**
 * Turns a mark into the grade shown in the table.
 *
 * Figma grades the five marks of the sheet A+, A+, A, A+ and A, so A+ starts
 * at 80 and A at 70. A mark that has not been entered yet has no grade.
 */
export function gradeForMark(marks: string): string {
  const value = Number(marks);

  if (marks.trim() === "" || !Number.isFinite(value)) return "—";
  if (value >= 80) return "A+";
  if (value >= 70) return "A";
  if (value >= 60) return "B";
  if (value >= 50) return "C";
  return "D";
}

/**
 * Turns a mark into the GPA shown in the table.
 * The scale mirrors the grade bands: A+ is 5.0 and A is 4.5. A mark that has
 * not been entered yet has no GPA.
 */
export function gpaForMark(marks: string): string {
  const value = Number(marks);

  if (marks.trim() === "" || !Number.isFinite(value)) return "—";
  if (value >= 80) return "5.0";
  if (value >= 70) return "4.5";
  if (value >= 60) return "4.0";
  if (value >= 50) return "3.5";
  return "3.0";
}

/** A mark that cannot be entered. */
export interface TeacherMarkError {
  /** Identifier of the offending row. */
  readonly rowId: string;
  /** Name of the student, used in the message. */
  readonly studentName: string;
  /** The message shown to the teacher. */
  readonly message: string;
}

/**
 * Checks the marks of a sheet.
 *
 * A mark that has not been entered yet is not an error — the teacher may fill
 * the sheet in row by row. A mark that is not a number, or one outside 0–100,
 * is reported so the teacher can fix it before publishing.
 */
export function validateTeacherMarks(
  rows: readonly TeacherResultRow[],
): TeacherMarkError[] {
  const errors: TeacherMarkError[] = [];

  for (const row of rows) {
    const trimmed = row.marks.trim();

    if (trimmed === "") continue;

    const value = Number(trimmed);

    if (!Number.isFinite(value)) {
      errors.push({
        rowId: row.id,
        studentName: row.name,
        message: `${row.name}: ${trimmed} is not a number.`,
      });
      continue;
    }

    if (value < 0 || value > 100) {
      errors.push({
        rowId: row.id,
        studentName: row.name,
        message: `${row.name}: ${trimmed} is above the maximum of 100. Correct the mark to publish.`,
      });
    }
  }

  return errors;
}

/** Finds the sheet of an exam. */
export function findTeacherResultSheet(
  exam: string,
): TeacherResultSheet | undefined {
  return teacherResultSheets.find((sheet) => sheet.exam === exam);
}
