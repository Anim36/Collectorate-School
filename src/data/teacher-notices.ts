/**
 * Teacher notice mock data.
 *
 * The board itself is the shared one from `@/data/notices`; this module holds
 * the teacher's view of it: the audiences the teacher may filter by and the
 * rows of the teacher table.
 *
 * Copy and order mirror the Figma "Teacher / Notice" frames (light 2:8753
 * desktop, 2:8899 tablet, 2:9013 mobile) and the matching dark frames.
 */

import { notices, type Notice } from "@/data/notices";

/** The audiences the teacher may filter the board by. */
export const teacherNoticeAudiences = [
  "For teachers",
  "For students",
  "For everyone",
] as const;

/** A single audience without the reset entry. */
export type TeacherNoticeAudience =
  (typeof teacherNoticeAudiences)[number];

/**
 * A row of the teacher notice table.
 *
 * Figma draws its own category column — "Academic", "Staff" and "Event" — so
 * the teacher table carries the audience the notice is addressed to alongside
 * the board's own category.
 */
export interface TeacherNoticeRow {
  /** Stable identifier of the notice. */
  readonly id: string;
  /** Short date, e.g. "04 Nov". */
  readonly date: string;
  /** Category shown in the table, e.g. "Staff". */
  readonly category: string;
  /** Notice headline. */
  readonly notice: string;
  /** The audiences the notice is addressed to. */
  readonly audiences: readonly TeacherNoticeAudience[];
}

/**
 * The shared board notices, extended with the two staff-only notices the
 * teacher board shows.
 *
 * Figma "Teacher / Notice" (2:8886) lists the notices of 04, 02 and 01
 * November — the annual examination schedule, the department planning meeting
 * and the science fair duty roster.
 */
export const teacherBoardNotices: readonly Notice[] = [
  notices[0],
  {
    id: "department-planning-meeting",
    publishedOn: "2026-11-02",
    publishedLabel: "02 Nov 2026",
    shortLabel: "02 Nov",
    category: "Event",
    title: "Department planning meeting",
    eyebrow: "DEPARTMENT MEETING / 2026",
    greeting: "Dear colleagues,",
    body: [
      "The science department planning meeting is held on 07 November 2026 at 09:00 in the staff room. The agenda covers the annual examination duty roster, the laboratory inventory and the science fair.",
      "Please read the draft schedule before the meeting and send any corrections to the department head.",
    ],
    signature: "Science Department\nNarail Collectorate School",
    attachments: [{ name: "Draft duty roster", format: "PDF", size: "110 KB" }],
    audience: ["staff"],
  },
  {
    id: "science-fair-duty-roster",
    publishedOn: "2026-11-01",
    publishedLabel: "01 Nov 2026",
    shortLabel: "01 Nov",
    category: "Event",
    title: "Science fair duty roster",
    eyebrow: "SCIENCE FAIR / 2026",
    greeting: "Dear colleagues,",
    body: [
      "The science fair duty roster is now available. Teachers supervising a class at the fair report to the school gate by 08:15 on 12 November 2026.",
      "Judging forms and the scoring sheet are attached for the teachers who sit on the panel.",
    ],
    signature: "Science Department\nNarail Collectorate School",
    attachments: [{ name: "Judging scoring sheet", format: "PDF", size: "64 KB" }],
    audience: ["staff"],
  },
];

/**
 * The rows of the teacher notice table.
 *
 * The teacher reads the school-wide notices and the ones addressed to the
 * staff, which is what Figma shows under "For teachers".
 */
export const teacherNoticeRows: readonly TeacherNoticeRow[] = [
  {
    id: "annual-examination-schedule",
    date: "04 Nov",
    category: "Academic",
    notice: "Annual examination schedule published",
    audiences: ["For teachers", "For everyone"],
  },
  {
    id: "department-planning-meeting",
    date: "02 Nov",
    category: "Staff",
    notice: "Department planning meeting",
    audiences: ["For teachers"],
  },
  {
    id: "science-fair-duty-roster",
    date: "01 Nov",
    category: "Event",
    notice: "Science fair duty roster",
    audiences: ["For teachers"],
  },
  {
    id: "science-fair-registration",
    date: "01 Nov",
    category: "Event",
    notice: "Science fair registration",
    audiences: ["For students", "For everyone"],
  },
  {
    id: "class-9-continuous-assessment-plan",
    date: "31 Oct",
    category: "Academic",
    notice: "Class 9 continuous assessment plan",
    audiences: ["For students"],
  },
];

/**
 * The rows of one audience.
 * A notice belongs to every audience it is addressed to.
 */
export function filterTeacherNoticeRows(
  audience: string,
): readonly TeacherNoticeRow[] {
  return teacherNoticeRows.filter((row) =>
    row.audiences.includes(audience as TeacherNoticeAudience),
  );
}
