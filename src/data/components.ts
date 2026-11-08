/** A row rendered inside the admin data table preview. */
export interface AdminTaskRecord {
  readonly id: string;
  readonly task: string;
  readonly count: string;
  readonly action: string;
}

/** Rows used by the data-table preview on /design-system. */
export const adminTaskRecords: readonly AdminTaskRecord[] = [
  {
    id: "unpaid-fees",
    task: "Unpaid fees",
    count: "125 students",
    action: "Review payments",
  },
  {
    id: "draft-notices",
    task: "Draft notices",
    count: "3 notices",
    action: "Continue editing",
  },
  {
    id: "new-admissions",
    task: "New admissions",
    count: "24 applications",
    action: "Review applications",
  },
];

/** A notice rendered inside the notice-card previews. */
export interface NoticeEntry {
  readonly id: string;
  readonly date: string;
  readonly category: string;
  readonly title: string;
  readonly description: string;
}

/** Notices used by the notice-card previews on /design-system. */
export const noticeEntries: readonly NoticeEntry[] = [
  {
    id: "exam-schedule",
    date: "04 NOV 2026",
    category: "ACADEMIC",
    title: "Annual examination schedule published",
    description: "Prepare for the upcoming annual examinations.",
  },
  {
    id: "sports-day",
    date: "12 NOV 2026",
    category: "EVENT",
    title: "Annual sports day — 18 to 20 November",
    description: "House teams assemble at 07:30 for the opening ceremony.",
  },
];

/** A teacher rendered inside the teacher-card preview. */
export interface TeacherEntry {
  readonly id: string;
  readonly name: string;
  readonly designation: string;
  readonly email: string;
  readonly photoId: string;
}

/** Teachers used by the teacher-card preview on /design-system. */
export const teacherEntries: readonly TeacherEntry[] = [
  {
    id: "nusrat-jahan",
    name: "Nusrat Jahan",
    designation: "Senior Teacher · Science",
    email: "nusrat@school.edu.bd",
    photoId: "teacher",
  },
];

/** A gallery album rendered inside the gallery-card preview. */
export interface GalleryEntry {
  readonly id: string;
  readonly title: string;
  readonly meta: string;
  readonly photoId: string;
}

/** Albums used by the gallery-card preview on /design-system. */
export const galleryEntries: readonly GalleryEntry[] = [
  {
    id: "science-fair-2026",
    title: "Science fair 2026",
    meta: "24 photos · 12 Nov 2026",
    photoId: "science-fair",
  },
];

/** Options used by the select preview on /design-system. */
export const classOptions = [
  { value: "class-8", label: "Class 8" },
  { value: "class-9", label: "Class 9" },
  { value: "class-10", label: "Class 10" },
  { value: "class-11", label: "Class 11" },
  { value: "class-12", label: "Class 12" },
] as const;

/** Tabs used by the tabs preview on /design-system. */
export const noticeTabs = [
  { value: "notices", label: "Notices" },
  { value: "events", label: "Events" },
  { value: "holidays", label: "Holidays" },
  { value: "achievements", label: "Achievements" },
] as const;
