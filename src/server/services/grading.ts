/**
 * The grade and the grade point of a mark.
 *
 * There is exactly one function that turns a mark into a grade, and it lives
 * on the server. The table shows the same numbers the sheet stores, and a
 * check can assert the boundaries without reading the browser bundle.
 *
 * The boundaries are the ones the teacher screens already show:
 *
 * | Mark | Grade | Grade point |
 * | ---- | ----- | ----------- |
 * | 80+  | A+    | 5.00        |
 * | 70–79 | A    | 4.50        |
 * | 60–69 | B    | 4.00        |
 * | 50–59 | C    | 3.50        |
 * | below 50 | D | 3.00        |
 *
 * A class that is graded on a grade only — Nursery and KG — stores no grade
 * point at all, so `gpa` is empty for it.
 */

/** The grade bands of the school. */
export interface GradeBand {
  /** The lowest mark of the band. */
  readonly from: number;
  /** The letter grade of the band. */
  readonly grade: string;
  /** The grade point of the band. */
  readonly point: number;
}

/** The bands, from the highest mark down. */
export const GRADE_BANDS: readonly GradeBand[] = [
  { from: 80, grade: "A+", point: 5 },
  { from: 70, grade: "A", point: 4.5 },
  { from: 60, grade: "B", point: 4 },
  { from: 50, grade: "C", point: 3.5 },
  { from: 0, grade: "D", point: 3 },
];

/** The grade of a mark, or an empty string when the mark is not a number. */
export function gradeForMark(marks: number | string | null): string {
  const value = toNumber(marks);

  if (value === null) return "";

  for (const band of GRADE_BANDS) {
    if (value >= band.from) return band.grade;
  }

  return GRADE_BANDS[GRADE_BANDS.length - 1].grade;
}

/**
 * The grade point of a mark, as the table shows it.
 *
 * A class that reports no grade point is given an empty string, so nothing
 * suggests a point that the school does not keep.
 */
export function gpaForMark(
  marks: number | string | null,
  gradeOnly = false,
): string {
  if (gradeOnly) return "";

  const value = toNumber(marks);

  if (value === null) return "";

  for (const band of GRADE_BANDS) {
    if (value >= band.from) return band.point.toFixed(2);
  }

  return GRADE_BANDS[GRADE_BANDS.length - 1].point.toFixed(2);
}

/** The mark as a number, or null when it is not one. */
function toNumber(marks: number | string | null): number | null {
  if (typeof marks === "number") {
    return Number.isFinite(marks) ? marks : null;
  }

  if (typeof marks !== "string") return null;

  const trimmed = marks.trim();

  if (trimmed === "") return null;

  const value = Number(trimmed);

  return Number.isFinite(value) ? value : null;
}

/**
 * The mark a teacher typed, as the number the sheet stores.
 *
 * A mark is a whole number out of 100, because that is what the column of the
 * database holds. A decimal is rounded to the nearest whole number, so the
 * number the table shows and the number the sheet stores are the same.
 *
 * An empty mark is null: a teacher may fill a sheet in row by row, and a row
 * that was not filled in is not an error. A mark outside 0–100 is null as
 * well, because it is not a mark at all; the table reports it as an error
 * before the sheet is written.
 */
export function parseMark(marks: number | string | null): number | null {
  const value = toNumber(marks);

  if (value === null) return null;
  if (value < 0 || value > 100) return null;

  return Math.round(value);
}
