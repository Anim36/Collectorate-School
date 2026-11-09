import { z } from "zod";

/**
 * The rules of the step 11B admin screens.
 *
 * They live here so the client forms and the server actions hold the same
 * standard, and so every input is checked on the server before it reaches
 * the database.
 */

/** The categories the notice editor offers. */
export const NOTICE_CATEGORIES = [
  "Academic",
  "Admission",
  "Event",
  "Holiday",
  "Achievement",
] as const;

/** The audiences a notice can be addressed to. */
export const NOTICE_AUDIENCES = [
  "PUBLIC",
  "STUDENTS",
  "TEACHERS",
  "GUARDIANS",
] as const;

/** The publication state of a notice. */
export const NOTICE_STATUSES = ["DRAFT", "PUBLISHED"] as const;

/** The kinds of calendar entry the admin can create. */
export const CALENDAR_EVENT_TYPES = ["EXAM", "HOLIDAY", "EVENT"] as const;

/** The categories the gallery filter offers. */
export const ALBUM_CATEGORIES = ["Academic", "Culture", "Sports"] as const;

/** The visibility an album can be published under. */
export const ALBUM_VISIBILITIES = ["PUBLIC", "TEACHERS"] as const;

/** The days of the school week, in order. */
export const ROUTINE_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
] as const;

/** The period times of the school day, one per period. */
export const ROUTINE_PERIOD_TIMES = [
  "08:00",
  "08:45",
  "09:30",
  "10:15",
  "11:30",
  "12:15",
  "13:00",
  "13:45",
] as const;

/** The rule a notice title has to follow. */
export const noticeTitleSchema = z
  .string()
  .trim()
  .min(3, "The notice title needs at least 3 characters")
  .max(200, "The notice title cannot be longer than 200 characters");

/** The rule a notice body has to follow. */
export const noticeBodySchema = z
  .string()
  .trim()
  .min(1, "Write the notice before saving it")
  .max(50_000, "The notice body is too long");

/** The categories a notice may be filed under. */
export const noticeCategorySchema = z.enum(NOTICE_CATEGORIES);

/** The audiences a notice may be addressed to. */
export const noticeAudienceSchema = z.enum(NOTICE_AUDIENCES);

/** The publication state of a notice. */
export const noticeStatusSchema = z.enum(NOTICE_STATUSES);

/** The list query of the notices table. */
export const listNoticesSchema = z.object({
  query: z.string().trim().max(120).optional(),
  category: z
    .union([z.enum(NOTICE_CATEGORIES), z.literal("ALL")])
    .default("ALL"),
  audience: z
    .union([z.enum(NOTICE_AUDIENCES), z.literal("ALL")])
    .default("ALL"),
  status: z.union([z.enum(NOTICE_STATUSES), z.literal("ALL")]).default("ALL"),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(10),
});

/** The notice the admin writes. */
export const saveNoticeSchema = z.object({
  id: z.string().trim().optional(),
  title: noticeTitleSchema,
  body: noticeBodySchema,
  category: noticeCategorySchema,
  audiences: z.array(noticeAudienceSchema).min(1, "Choose who should see this"),
  publishedOn: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a publish date")
    .optional(),
});

/** The calendar event the admin writes. */
export const saveCalendarEventSchema = z
  .object({
    id: z.string().trim().optional(),
    title: z
      .string()
      .trim()
      .min(1, "Give the event a title")
      .max(200, "The event title cannot be longer than 200 characters"),
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
    endDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an end date")
      .optional(),
    type: z.enum(CALENDAR_EVENT_TYPES),
    audience: z.string().trim().max(120).optional(),
  })
  .refine(
    (value) => !value.endDate || value.endDate >= value.date,
    { message: "The end date cannot be before the start date", path: ["endDate"] },
  );

/** The list query of the calendar table. */
export const listCalendarEventsSchema = z.object({
  query: z.string().trim().max(120).optional(),
  type: z.union([z.enum(CALENDAR_EVENT_TYPES), z.literal("ALL")]).default("ALL"),
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, "Choose a month")
    .optional(),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(20),
});

/** The album the admin writes. */
export const saveAlbumSchema = z.object({
  id: z.string().trim().optional(),
  title: z
    .string()
    .trim()
    .min(1, "Give the album a name")
    .max(120, "The album name cannot be longer than 120 characters"),
  category: z.enum(ALBUM_CATEGORIES).optional(),
  visibility: z.enum(ALBUM_VISIBILITIES).default("PUBLIC"),
});

/** The list query of the albums table. */
export const listAlbumsSchema = z.object({
  query: z.string().trim().max(120).optional(),
  category: z
    .union([z.enum(ALBUM_CATEGORIES), z.literal("ALL")])
    .default("ALL"),
});

/** One period of the weekly timetable. */
export const routinePeriodSchema = z.object({
  /** The day of the week, 0 for Sunday through 4 for Thursday. */
  day: z.number().int().min(0).max(4),
  /** The period number, from 1 to 8. */
  period: z.number().int().min(1).max(8),
  /** The subject of the period, when it is filled in. */
  subjectId: z.string().trim().optional(),
  /** The teacher of the period, when it is filled in. */
  teacherId: z.string().trim().optional(),
});

/** The timetable the admin saves. */
export const saveRoutineSchema = z.object({
  classId: z.string().trim().min(1, "Choose a class"),
  /** The date the timetable takes effect from, ISO (`yyyy-mm-dd`). */
  effectiveFrom: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the effective date"),
  /** The periods of the week, each with its day and its number. */
  periods: z.array(routinePeriodSchema).max(40),
});

/**
 * The answer every service call gives.
 *
 * A refusal carries the machine readable reason as well as the message, so a
 * check can tell an empty file from a file of an unknown type.
 */
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; reason?: ServiceRejection };

/** The reasons a service refuses a request for. */
export type ServiceRejection =
  | "EMPTY"
  | "TOO_LARGE"
  | "TOO_MANY"
  | "UNKNOWN_TYPE"
  | "INVALID";

/** The validated list query of the notices table. */
export type ListNoticesInput = z.infer<typeof listNoticesSchema>;

/** The validated notice the admin writes. */
export type SaveNoticeInput = z.infer<typeof saveNoticeSchema>;

/** The validated calendar event the admin writes. */
export type SaveCalendarEventInput = z.infer<typeof saveCalendarEventSchema>;

/** The validated list query of the calendar table. */
export type ListCalendarEventsInput = z.infer<typeof listCalendarEventsSchema>;

/** The validated album the admin writes. */
export type SaveAlbumInput = z.infer<typeof saveAlbumSchema>;

/** The validated timetable the admin saves. */
export type SaveRoutineInput = z.infer<typeof saveRoutineSchema>;
