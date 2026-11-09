/**
 * Admin portal mock data for the step 11B pages.
 *
 * Copy, order and geometry mirror the Figma "Admin" frames:
 *   "Admin / Notices"  (2:11912 / 2:12070 / 2:12189 and the dark twins)
 *   "Admin / Gallery"  (2:12301 / 2:12470 / 2:12600 and the dark twins)
 *   "Admin / Routine"  (2:12718 / 2:12906 / 2:13055 and the dark twins)
 *   "Admin / Calendar" (2:13191 / 2:13380 / 2:13530 and the dark twins)
 *
 * Nothing here talks to a server: the admin pages keep their edits in memory.
 */

import { teacherUploads, type TeacherUpload } from "@/data/teacher-gallery";

/* ------------------------------------------------------------- notices --- */

/** The publication state of a notice. */
export type AdminNoticeStatus = "Draft" | "Published";

/** The audiences a notice can be addressed to. */
export type AdminNoticeAudience = "Public" | "Students" | "Teachers";

/** The audiences offered by the editor, in the order Figma lists them. */
export const ADMIN_NOTICE_AUDIENCES: readonly AdminNoticeAudience[] = [
  "Public",
  "Students",
  "Teachers",
];

/** A file attached to a notice. */
export interface AdminNoticeAttachment {
  /** Stable identifier of the attachment. */
  readonly id: string;
  /** File name shown in the attachments block. */
  readonly name: string;
  /** File size shown next to the name. */
  readonly size: string;
}

/** A notice the admin is writing or has written. */
export interface AdminNotice {
  /** Stable identifier of the notice. */
  readonly id: string;
  /** Headline of the notice. */
  readonly title: string;
  /** Category the notice is filed under. */
  readonly category: string;
  /** Body of the notice, as rich text. */
  readonly body: string;
  /** Audiences the notice is addressed to. */
  readonly audiences: readonly AdminNoticeAudience[];
  /** Files attached to the notice. */
  readonly attachments: readonly AdminNoticeAttachment[];
  /** Publication state of the notice. */
  readonly status: AdminNoticeStatus;
  /** Date the notice is published on, ISO (`yyyy-mm-dd`). */
  readonly publishedOn: string;
}

/** The categories the notice editor offers. */
export const ADMIN_NOTICE_CATEGORIES = [
  "Academic",
  "Admission",
  "Event",
  "Holiday",
  "Achievement",
] as const;

/** The body Figma draws in the rich text editor. */
export const ADMIN_NOTICE_BODY = `Dear students and guardians,

The annual examinations for Classes 6–10 will begin on 22 November 2026 and run for two weeks. The complete schedule is attached to this notice.

Students must report forty-five minutes before each paper, bring their admit cards and writing materials, and arrive in full uniform.`;

/**
 * The notices the admin has written.
 *
 * Figma "Admin / Notices" (2:11912) opens on the annual examination notice,
 * with the audience set to every group and one attached file.
 */
export const adminNotices: readonly AdminNotice[] = [
  {
    id: "notice-annual-examination",
    title: "Annual examination schedule published",
    category: "Academic",
    body: ADMIN_NOTICE_BODY,
    audiences: ["Public", "Students", "Teachers"],
    attachments: [
      { id: "attachment-exam-schedule", name: "annual-exam-schedule.pdf", size: "240 KB" },
    ],
    status: "Published",
    publishedOn: "2026-11-04",
  },
  {
    id: "notice-science-fair",
    title: "Science fair registration",
    category: "Event",
    body: "Registration for the annual science fair is open until 10 November 2026. Teams of three students may submit one project each.",
    audiences: ["Public", "Students"],
    attachments: [],
    status: "Published",
    publishedOn: "2026-11-01",
  },
  {
    id: "notice-department-meeting",
    title: "Department planning meeting",
    category: "Event",
    body: "The science department planning meeting is held on 07 November 2026 at 09:00 in the staff room.",
    audiences: ["Teachers"],
    attachments: [],
    status: "Draft",
    publishedOn: "2026-11-02",
  },
];

/** The copy under the notice editor's title, as Figma draws it. */
export const adminNoticeHint =
  "Draft saved just now. Nothing is public until you publish.";

/* ------------------------------------------------------------- gallery --- */

/** The visibility an album is published under. */
export type AdminAlbumVisibility = "Public" | "Teachers";

/** An album in the admin gallery. */
export interface AdminAlbum {
  /** Stable identifier of the album. */
  readonly id: string;
  /** Album title. */
  readonly title: string;
  /** Number of photographs in the album. */
  readonly photoCount: number;
  /** Who the album is visible to. */
  readonly visibility: AdminAlbumVisibility;
  /** Category the album is filed under. */
  readonly category: string;
}

/** The categories the gallery filter offers. */
export const ADMIN_ALBUM_CATEGORIES = [
  "All categories",
  "Academic",
  "Culture",
  "Sports",
] as const;

/**
 * The albums the admin manages.
 *
 * Figma "Admin / Gallery" (2:12301) lists three albums: "Science fair 2026",
 * "Annual sports day" and "Staff development".
 */
export const adminAlbums: readonly AdminAlbum[] = [
  {
    id: "album-science-fair-2026",
    title: "Science fair 2026",
    photoCount: 24,
    visibility: "Public",
    category: "Academic",
  },
  {
    id: "album-annual-sports-day",
    title: "Annual sports day",
    photoCount: 36,
    visibility: "Public",
    category: "Sports",
  },
  {
    id: "album-staff-development",
    title: "Staff development",
    photoCount: 12,
    visibility: "Teachers",
    category: "Culture",
  },
];

/** The state of a photo waiting for the admin. */
export type AdminPhotoReviewState = "Awaiting admin approval" | "Approved" | "Rejected";

/** A teacher-uploaded photo the admin can approve or reject. */
export interface AdminPhotoReview {
  /** Stable identifier of the photo. */
  readonly id: string;
  /** File name of the photo. */
  readonly name: string;
  /** File size of the photo. */
  readonly size: string;
  /** Album the photo was uploaded to. */
  readonly album: string;
  /** Where the photo sits in the approval flow. */
  readonly state: AdminPhotoReviewState;
}

/**
 * The photos waiting for the admin.
 *
 * The teacher gallery stages its uploads as "Awaiting admin approval"
 * (2:9251), so the admin queue opens on the same photos.
 */
export const adminPhotoReviews: readonly AdminPhotoReview[] =
  teacherUploads.map((upload: TeacherUpload) => ({
    id: upload.id,
    name: upload.name,
    size: upload.size,
    album: "Science fair 2026",
    state: "Awaiting admin approval" as const,
  }));

/* ------------------------------------------------------------- routine --- */

/** The period times of the school day, one per period. */
export const ADMIN_ROUTINE_PERIOD_TIMES = [
  "08:00",
  "08:45",
  "09:30",
  "10:15",
  "11:30",
  "12:15",
  "13:00",
  "13:45",
] as const;

/** The days the school teaches on. */
export const ADMIN_ROUTINE_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu"] as const;

/** A single teaching day without the reset entry. */
export type AdminRoutineDay = (typeof ADMIN_ROUTINE_DAYS)[number];

/**
 * The subjects the routine can be filled with.
 * The public routine lists these in the same order.
 */
export const ADMIN_ROUTINE_SUBJECTS = [
  "Bangla",
  "English",
  "Math",
  "Science",
  "ICT",
  "Religion",
  "History",
  "Physical Education",
] as const;

/**
 * The Class 9 timetable, exactly as Figma draws it
 * (Figma "Admin / Routine" 2:12858–2:12895).
 *
 * The first four periods are the ones Figma shows; the afternoon periods
 * carry on the same subjects so a period can always be assigned.
 */
export const adminRoutine: Record<AdminRoutineDay, readonly string[]> = {
  Sun: [
    "Bangla",
    "English",
    "Math",
    "Science",
    "ICT",
    "Religion",
    "History",
    "Physical Education",
  ],
  Mon: ["English", "Math", "Bangla", "Science", "History", "ICT", "Religion", "Arts"],
  Tue: [
    "Math",
    "Science",
    "English",
    "Bangla",
    "Religion",
    "History",
    "ICT",
    "Physical Education",
  ],
  Wed: ["Science", "Bangla", "Math", "English", "ICT", "Religion", "Arts", "History"],
  Thu: [
    "Bangla",
    "English",
    "Science",
    "Math",
    "History",
    "ICT",
    "Physical Education",
    "Library",
  ],
};

/**
 * The footnote under the routine table, as Figma draws it.
 */
export const ADMIN_ROUTINE_NOTE =
  "Morning periods 1–4 shown · Select a cell to assign a subject.";

/* ----------------------------------------------------------- calendar --- */

/** The kinds of calendar entry the admin can create. */
export const ADMIN_CALENDAR_EVENT_TYPES = [
  "School event",
  "Exam",
  "Holiday",
] as const;

/** A single event type without the reset entry. */
export type AdminCalendarEventType = (typeof ADMIN_CALENDAR_EVENT_TYPES)[number];

/** Who a calendar entry is addressed to. */
export type AdminCalendarAudience = "Everyone" | "Students, Teachers";

/** A row of the admin calendar table. */
export interface AdminCalendarRow {
  /** Stable identifier of the entry. */
  readonly id: string;
  /** Date of the entry, ISO (`yyyy-mm-dd`). */
  readonly date: string;
  /** Date shown in the table, e.g. "08 Nov 2026". */
  readonly dateLabel: string;
  /** Title of the entry. */
  readonly title: string;
  /** Kind of the entry. */
  readonly type: AdminCalendarEventType;
  /** Who the entry is addressed to. */
  readonly audience: AdminCalendarAudience;
}

/**
 * The calendar entries the admin manages.
 *
 * Figma "Admin / Calendar" (2:13333) lists four entries: the parent–teacher
 * meeting, the science fair, the public holiday and the examinations.
 */
export const adminCalendarRows: readonly AdminCalendarRow[] = [
  {
    id: "calendar-pt-meeting",
    date: "2026-11-08",
    dateLabel: "08 Nov 2026",
    title: "Parent–teacher meeting",
    type: "School event",
    audience: "Everyone",
  },
  {
    id: "calendar-science-fair",
    date: "2026-11-12",
    dateLabel: "12 Nov 2026",
    title: "Annual science fair",
    type: "School event",
    audience: "Everyone",
  },
  {
    id: "calendar-public-holiday",
    date: "2026-11-26",
    dateLabel: "26 Nov 2026",
    title: "Public holiday",
    type: "Holiday",
    audience: "Everyone",
  },
  {
    id: "calendar-examinations",
    date: "2026-12-01",
    dateLabel: "01 Dec 2026",
    title: "Annual examinations begin",
    type: "Exam",
    audience: "Students, Teachers",
  },
];

/** The months the calendar filter offers. */
export const ADMIN_CALENDAR_MONTHS = [
  "November 2026",
  "December 2026",
  "January 2027",
] as const;

/** The types the calendar filter offers. */
export const ADMIN_CALENDAR_FILTER_TYPES = [
  "All event types",
  "School event",
  "Exam",
  "Holiday",
] as const;

/** The date the admin calendar opens on, ISO (`yyyy-mm-dd`). */
export const ADMIN_CALENDAR_START_DATE = "2026-11-12";

/** The long date the calendar draws, e.g. "12 November 2026". */
export const ADMIN_CALENDAR_START_DATE_LABEL = "12 November 2026";

/** The publish date the notice editor draws, e.g. "04 November 2026 · Now". */
export const ADMIN_NOTICE_PUBLISH_DATE = "04 November 2026 · Now";
