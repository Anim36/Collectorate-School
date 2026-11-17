import { z } from "zod";

import type { ServiceResult } from "@/server/services/admin-schemas";

/**
 * The rules of the teacher portal.
 *
 * They live here so the client forms and the server actions hold the same
 * standard, and so every input is checked on the server before it reaches the
 * database.
 */

/**
 * The day a sheet may still be edited.
 *
 * A teacher can correct a sheet on the day it was marked and on the three days
 * after it. An admin can edit any sheet, so the window is only applied to
 * teachers. The number is one constant, so the rule is one line to change.
 */
export const TEACHER_ATTENDANCE_EDIT_WINDOW_DAYS = 3;

/** The mark a teacher may give a student. */
export const teacherAttendanceStatusSchema = z.enum([
  "present",
  "absent",
  "late",
]);

/** The date of a sheet, as the server reads it. */
export const teacherDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date");

/** One mark of a sheet. */
export const teacherAttendanceMarkSchema = z.object({
  /** The id of the student the mark belongs to. */
  studentId: z.string().trim().min(1, "A mark needs a student"),
  /** How the student was marked. */
  status: teacherAttendanceStatusSchema,
});

/** The sheet a teacher saves. */
export const teacherAttendanceSheetSchema = z.object({
  /** The id of the class the sheet belongs to. */
  classId: z.string().trim().min(1, "Choose a class"),
  /** The day the sheet is for. */
  date: teacherDateSchema,
  /** The marks of the students, one per student of the class. */
  marks: z
    .array(teacherAttendanceMarkSchema)
    .min(1, "Mark the students of the class first"),
});

/** The validated sheet a teacher saves. */
export type TeacherAttendanceSheetInput = z.infer<
  typeof teacherAttendanceSheetSchema
>;

/**
 * A mark of a result sheet.
 *
 * A mark may carry decimals, because the table accepts them, and it may be
 * empty, because a teacher may fill a sheet in row by row.
 */
export const teacherMarkSchema = z
  .string()
  .trim()
  .max(10, "That mark is too long")
  .refine(
    (value) => value === "" || /^\d{1,3}(\.\d{1,2})?$/.test(value),
    "Enter a number between 0 and 100",
  )
  .refine(
    (value) => value === "" || Number(value) <= 100,
    "A mark cannot be above 100",
  );

/** The sheet a teacher saves. */
export const teacherResultSheetSchema = z.object({
  /** The id of the exam the sheet belongs to. */
  examId: z.string().trim().min(1, "Choose an exam"),
  /** The id of the class the sheet belongs to. */
  classId: z.string().trim().min(1, "Choose a class"),
  /** The id of the subject the sheet belongs to. */
  subjectId: z.string().trim().min(1, "Choose a subject"),
  /** The marks of the students, keyed by student id. */
  marks: z.record(z.string().trim().min(1), teacherMarkSchema),
});

/** The validated sheet a teacher saves. */
export type TeacherResultSheetInput = z.infer<
  typeof teacherResultSheetSchema
>;

/**
 * The audience the teacher filters the notice board by.
 *
 * The three filters are the ones Figma draws, and each one names the group the
 * notice is addressed to.
 */
export const teacherNoticeAudienceSchema = z.enum([
  "For teachers",
  "For students",
  "For everyone",
]);

/** The filters of the teacher notice board. */
export const teacherNoticeFilterSchema = z.object({
  /** The free-text search over the headline and the body. */
  query: z.string().trim().max(120).optional(),
  /** The audience the board is filtered by. */
  audience: teacherNoticeAudienceSchema.optional(),
  /** The zero-based index of the visible page. */
  page: z.number().int().min(0).default(0),
  /** The number of notices on a page. */
  pageSize: z.number().int().min(1).max(50).default(6),
});

/** The validated filters of the teacher notice board. */
export type TeacherNoticeFilterInput = z.infer<
  typeof teacherNoticeFilterSchema
>;

/**
 * The answer every teacher service call gives.
 *
 * A refusal carries the machine readable reason as well as the message, so a
 * check can tell one refusal from another.
 */
export type TeacherResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; reason?: TeacherRejection };

/** The reasons a teacher service refuses a request for. */
export type TeacherRejection =
  | "EMPTY"
  | "TOO_LARGE"
  | "TOO_MANY"
  | "UNKNOWN_TYPE"
  | "INVALID"
  | "FORBIDDEN"
  | "OUT_OF_WINDOW";

export type { ServiceResult };
