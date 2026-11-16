import type { NoticeAttachment } from "@/types/notice";

/**
 * Notice board mock data.
 * Copy, order and geometry mirror the Figma "Public / Notice" and
 * "Public / Notice detail" frames (light 2:1480 / 2:1587 / 2:1688 and
 * 2:1786 / 2:1862 / 2:1932, plus the matching dark frames).
 */

/** Notice categories offered by the board filter. */
export const noticeCategories = [
  "All categories",
  "Academic",
  "Admission",
  "Event",
  "Holiday",
  "Achievement",
] as const;

/** A single notice category without the reset entry. */
export type NoticeCategory = Exclude<(typeof noticeCategories)[number], "All categories">;

export interface Notice {
  /** Stable identifier used in the route `/notice/[id]`. */
  id: string;
  /** Publication date, ISO (`yyyy-mm-dd`). */
  publishedOn: string;
  /** Date shown to the reader, e.g. "04 Nov 2026". */
  publishedLabel: string;
  /** Short date shown in the portal tables, e.g. "04 Nov". */
  shortLabel: string;
  /** Notice category. */
  category: NoticeCategory;
  /** Notice headline. */
  title: string;
  /** Eyebrow line of the article, e.g. "ANNUAL EXAMINATION / 2026". */
  eyebrow: string;
  /** Salutation line of the article body. */
  greeting: string;
  /** Body paragraphs of the notice. */
  body: readonly string[];
  /** Signature block of the article. */
  signature: string;
  /** Files attached to the notice. */
  attachments: readonly NoticeAttachment[];
  /**
   * Audiences the notice is addressed to.
   * The public board shows every notice; the portal pages narrow the list
   * down to the ones addressed to the signed-in student.
   */
  audience: readonly NoticeAudience[];
}

/** Audiences a notice can be addressed to. */
export type NoticeAudience = "everyone" | "students" | "guardians" | "staff";

/**
 * The notice board.
 * The first six entries mirror the Figma "Public / Notice" rows exactly
 * (nodes 2:1526–2:1551); the remaining entries back the pagination and the
 * category filter.
 */
export const notices: readonly Notice[] = [
  {
    id: "annual-examination-schedule",
    publishedOn: "2026-11-04",
    publishedLabel: "04 Nov 2026",
    shortLabel: "04 Nov",
    category: "Academic",
    title: "Annual examination schedule published",
    eyebrow: "ANNUAL EXAMINATION / 2026",
    greeting: "Dear students and guardians,",
    body: [
      "The annual examinations for Classes 6–10 will begin on 22 November 2026 and run for two weeks. The complete schedule is attached to this notice.",
      "Students must report forty-five minutes before each paper, bring their admit cards and writing materials, and arrive in full uniform. Hall tickets can be collected from the class teacher during the week of 15 November.",
      "Invigilators and support staff should confirm their duty roster with the academic office before 18 November.",
    ],
    signature: "Academic Office\nNarail Collectorate School",
    attachments: [
      { name: "Annual examination schedule 2026", format: "PDF", size: "240 KB" },
      { name: "Examination guidelines", format: "PDF", size: "128 KB" },
    ],
    audience: ["everyone"],
  },
  {
    id: "admissions-2027-open",
    publishedOn: "2026-11-02",
    publishedLabel: "02 Nov 2026",
    shortLabel: "02 Nov",
    category: "Admission",
    title: "Admissions for 2027 are now open",
    eyebrow: "ADMISSIONS / 2027",
    greeting: "Dear parents and guardians,",
    body: [
      "Applications for the 2027 academic year are now open for Classes 6 to 10. Completed forms along with the required documents can be submitted at the school office between 9:00 AM and 4:00 PM on working days.",
      "The last date for applications is 15 December 2026. Shortlisted candidates will be invited for an assessment and a short conversation with the academic team.",
    ],
    signature: "Admission Office\nNarail Collectorate School",
    attachments: [
      { name: "Application form 2027", format: "PDF", size: "180 KB" },
      { name: "Required documents checklist", format: "PDF", size: "72 KB" },
    ],
    audience: ["everyone"],
  },
  {
    id: "science-fair-registration",
    publishedOn: "2026-11-01",
    publishedLabel: "01 Nov 2026",
    shortLabel: "01 Nov",
    category: "Event",
    title: "Science fair registration",
    eyebrow: "SCIENCE FAIR / 2026",
    greeting: "Dear students,",
    body: [
      "Registration for the annual science fair is open until 10 November 2026. Teams of three students may submit one project each, and every entry must be registered with the science department.",
      "The fair will be held on 12 November 2026 in the school auditorium, with judging from 10:00 AM.",
    ],
    signature: "Science Department\nNarail Collectorate School",
    attachments: [
      { name: "Science fair registration form", format: "PDF", size: "120 KB" },
    ],
    audience: ["everyone"],
  },
  {
    id: "public-holiday-closure",
    publishedOn: "2026-10-29",
    publishedLabel: "29 Oct 2026",
    shortLabel: "29 Oct",
    category: "Holiday",
    title: "Public holiday school closure",
    eyebrow: "PUBLIC HOLIDAY / 2026",
    greeting: "Dear students and guardians,",
    body: [
      "The school will remain closed on 26 November 2026 on account of a public holiday. Regular classes resume the following day.",
    ],
    signature: "Office of the Head of Institution\nNarail Collectorate School",
    attachments: [],
    audience: ["everyone"],
  },
  {
    id: "parent-teacher-meeting-08-november",
    publishedOn: "2026-10-26",
    publishedLabel: "26 Oct 2026",
    shortLabel: "26 Oct",
    category: "Academic",
    title: "Parent–teacher meeting on 08 November",
    eyebrow: "PARENT–TEACHER MEETING / 2026",
    greeting: "Dear parents and guardians,",
    body: [
      "The parent–teacher meeting for Classes 6 to 10 will be held on 08 November 2026 from 10:00 AM. Each family receives a twenty-minute slot, booked with the class teacher in advance.",
      "Report cards will be handed over during the meeting. Parents who cannot attend are asked to arrange a separate appointment with the class teacher.",
    ],
    signature: "Academic Office\nNarail Collectorate School",
    attachments: [{ name: "Meeting schedule by class", format: "PDF", size: "95 KB" }],
    audience: ["guardians"],
  },
  {
    id: "inter-school-debate-champions",
    publishedOn: "2026-10-22",
    publishedLabel: "22 Oct 2026",
    shortLabel: "22 Oct",
    category: "Achievement",
    title: "Inter-school debate champions",
    eyebrow: "DEBATE / ACHIEVEMENT",
    greeting: "Dear students and guardians,",
    body: [
      "Our senior debate team has won the inter-school championship held in Narail. The team competed against nine schools and convinced the judges in all three rounds.",
      "We thank the students, their coach and the parents who supported the team throughout the season.",
    ],
    signature: "Head of Institution\nNarail Collectorate School",
    attachments: [],
    audience: ["everyone"],
  },
  {
    id: "annual-sports-day-18-october",
    publishedOn: "2026-10-18",
    publishedLabel: "18 Oct 2026",
    shortLabel: "18 Oct",
    category: "Event",
    title: "Annual sports day — full schedule",
    eyebrow: "SPORTS DAY / 2026",
    greeting: "Dear students and guardians,",
    body: [
      "The annual sports day will be held on 18 October 2026 at the district stadium. Students of Classes 6 to 10 report to the ground by 8:00 AM in full sports uniform.",
      "Parents and guardians are welcome to attend. Please carry water and a cap, as the sessions continue through the afternoon.",
    ],
    signature: "Physical Education Department\nNarail Collectorate School",
    attachments: [{ name: "Sports day event schedule", format: "PDF", size: "140 KB" }],
    audience: ["everyone"],
  },
  {
    id: "half-yearly-exam-results",
    publishedOn: "2026-10-12",
    publishedLabel: "12 Oct 2026",
    shortLabel: "12 Oct",
    category: "Academic",
    title: "Half-yearly examination results published",
    eyebrow: "RESULTS / 2026",
    greeting: "Dear students and guardians,",
    body: [
      "The half-yearly examination results have been published. Students can collect their report cards from the class teacher during school hours from 13 October 2026.",
      "A re-evaluation request may be submitted in writing within seven days of the result being published.",
    ],
    signature: "Examination Cell\nNarail Collectorate School",
    attachments: [{ name: "Result summary by class", format: "PDF", size: "88 KB" }],
    audience: ["students", "guardians"],
  },
  {
    id: "library-week-reading-drive",
    publishedOn: "2026-10-08",
    publishedLabel: "08 Oct 2026",
    shortLabel: "08 Oct",
    category: "Event",
    title: "Library week reading drive",
    eyebrow: "LIBRARY WEEK / 2026",
    greeting: "Dear students,",
    body: [
      "Library week runs from 08 to 14 October 2026. Each class will contribute its reading log and the class with the highest number of borrowed books receives the reading trophy.",
      "Students who read at least three books over the week may submit their log to the library desk.",
    ],
    signature: "Library Committee\nNarail Collectorate School",
    attachments: [],
    audience: ["students"],
  },
  {
    id: "national-competition-success",
    publishedOn: "2026-10-02",
    publishedLabel: "02 Oct 2026",
    shortLabel: "02 Oct",
    category: "Achievement",
    title: "National mathematics competition success",
    eyebrow: "ACHIEVEMENT / 2026",
    greeting: "Dear students and guardians,",
    body: [
      "Two of our students have qualified for the national mathematics competition after the divisional round. Both are from Class 9.",
      "We congratulate them and their teachers, and we wish them every success in the national stage.",
    ],
    signature: "Mathematics Department\nNarail Collectorate School",
    attachments: [],
    audience: ["students", "guardians"],
  },
  {
    id: "annual-report-2026",
    publishedOn: "2026-09-28",
    publishedLabel: "28 Sep 2026",
    shortLabel: "28 Sep",
    category: "Academic",
    title: "Annual report 2026 published",
    eyebrow: "ANNUAL REPORT / 2026",
    greeting: "Dear parents and guardians,",
    body: [
      "The annual report for the 2025–26 session is now available. It covers academic performance, co-curricular activity, attendance and the financial summary.",
      "Copies are available from the school office and a digital version has been shared with the parent portal.",
    ],
    signature: "Office of the Head of Institution\nNarail Collectorate School",
    attachments: [{ name: "Annual report 2026", format: "PDF", size: "2.4 MB" }],
    audience: ["guardians"],
  },
  {
    id: "eid-holiday-list",
    publishedOn: "2026-09-20",
    publishedLabel: "20 Sep 2026",
    shortLabel: "20 Sep",
    category: "Holiday",
    title: "Festival holiday list for the session",
    eyebrow: "HOLIDAYS / 2026",
    greeting: "Dear students and guardians,",
    body: [
      "The list of festival holidays for the 2026–27 session has been published. The school will reopen on the working day following each holiday.",
      "Classes that fall on a holiday will follow the published catch-up plan.",
    ],
    signature: "Academic Office\nNarail Collectorate School",
    attachments: [{ name: "Festival holiday list", format: "PDF", size: "64 KB" }],
    audience: ["everyone"],
  },
  {
    id: "class-9-continuous-assessment-plan",
    publishedOn: "2026-10-31",
    publishedLabel: "31 Oct 2026",
    shortLabel: "31 Oct",
    category: "Academic",
    title: "Class 9 continuous assessment plan",
    eyebrow: "CONTINUOUS ASSESSMENT / 2026",
    greeting: "Dear students,",
    body: [
      "The continuous assessment plan for Class 9 has been released. Each subject carries two class tests and one practical, spread across the term so that no two assessments fall in the same week.",
      "Your class teacher will share the detailed schedule in class. Quiz and homework contributions will make up the thirty per cent internal assessment for the half-yearly examination.",
    ],
    signature: "Class Teacher, Class 9\nNarail Collectorate School",
    attachments: [{ name: "Continuous assessment plan 2026", format: "PDF", size: "156 KB" }],
    audience: ["students"],
  },
  {
    id: "sports-practice-trial-selection",
    publishedOn: "2026-10-30",
    publishedLabel: "30 Oct 2026",
    shortLabel: "30 Oct",
    category: "Event",
    title: "Sports practice trial and selection",
    eyebrow: "SPORTS TRIAL / 2026",
    greeting: "Dear students,",
    body: [
      "Trials for the district inter-school athletics team will be held during the morning break from 09 November 2026 onwards. Every student of Classes 8 to 10 may take part.",
      "Bring your sports uniform and a pair of shoes with spikes. The physical education department will record the trials and publish the selection list the same week.",
    ],
    signature: "Physical Education Department\nNarail Collectorate School",
    attachments: [],
    audience: ["students"],
  },
  {
    id: "library-borrowing-rules",
    publishedOn: "2026-10-27",
    publishedLabel: "27 Oct 2026",
    shortLabel: "27 Oct",
    category: "Event",
    title: "Library borrowing rules and due dates",
    eyebrow: "LIBRARY / 2026",
    greeting: "Dear students,",
    body: [
      "Students may borrow two books at a time and keep them for fourteen days. A book that is returned late cannot be renewed, and the reading deposit is held until it is returned.",
      "Reference books and the current issue of periodicals may be read in the library only. Please sign the issue register before you leave.",
    ],
    signature: "Library Committee\nNarail Collectorate School",
    attachments: [],
    audience: ["students"],
  },
  {
    id: "house-competition-final-standings",
    publishedOn: "2026-10-24",
    publishedLabel: "24 Oct 2026",
    shortLabel: "24 Oct",
    category: "Achievement",
    title: "House competition final standings",
    eyebrow: "HOUSE COMPETITION / 2026",
    greeting: "Dear students,",
    body: [
      "The inter-house competitions for the second term are complete. Green House has taken the overall championship, with the athletics relay and the debate trophy contributing the most points.",
      "Certificates for the winners will be handed over at the assembly on 05 November 2026. Our congratulations go to every house team that took part.",
    ],
    signature: "House Master Coordinator\nNarail Collectorate School",
    attachments: [],
    audience: ["students"],
  },
];

/**
 * Default filter range used by the notice board.
 * The Figma frame shows 01 October 2026 to 30 November 2026.
 */
export const noticeDefaultRange = {
  from: "2026-10-01",
  to: "2026-11-30",
} as const;

/** Finds a notice by its route identifier. */
export function findNotice(noticeId: string): Notice | undefined {
  return notices.find((notice) => notice.id === noticeId);
}

/** Formats an ISO date the way the Figma frames show it, e.g. "04 November 2026". */
export function formatLongNoticeDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
