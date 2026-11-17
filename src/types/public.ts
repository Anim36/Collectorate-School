/**
 * The shapes the public pages share with the server.
 *
 * Every one of these is an explicit allow-list: a public service may only
 * fill these fields, so a phone number, an email, an address or a guardian
 * of a student can never travel from the database to an anonymous visitor,
 * whatever the query behind it selects.
 */

/* ---------------------------------------------------------------- notices --- */

/** A file attached to a public notice. */
export interface PublicNoticeAttachment {
  /** File name shown in the attachment table. */
  name: string;
  /** File format, e.g. "PDF". */
  format: string;
  /** File size, e.g. "240 KB". */
  size: string;
  /**
   * Id of the stored file, used by the file route.
   *
   * It is empty for an attachment that was never really uploaded, so the
   * table can show the name without offering a link that goes nowhere.
   */
  fileId?: string;
}

/** One row of the public notice board. */
export interface PublicNoticeRow {
  /** Stable identifier used in the route `/notice/[id]`. */
  id: string;
  /** Publication date, ISO (`yyyy-mm-dd`). */
  publishedOn: string;
  /** Date shown to the reader, e.g. "04 Nov 2026". */
  publishedLabel: string;
  /** Short date shown in the tables, e.g. "04 Nov". */
  shortLabel: string;
  /** Notice category. */
  category: string;
  /** Notice headline. */
  title: string;
  /** A plain-text extract of the body, for the search. */
  searchText: string;
  /** Files attached to the notice, for the attachment column. */
  attachments: readonly PublicNoticeAttachment[];
}

/** The whole public notice board: the page, the filters and the real counts. */
export interface PublicNoticeBoard {
  /** The rows of the visible page. */
  rows: readonly PublicNoticeRow[];
  /** How many notices match the filters in total. */
  total: number;
  /** The zero-based index of the visible page. */
  page: number;
  /** How many notices a page carries. */
  pageSize: number;
  /** How many pages the filters produce. */
  pageCount: number;
  /** The categories the filter offers, with the reset entry first. */
  categories: readonly string[];
}

/** A public notice in full, as the detail page shows it. */
export interface PublicNoticeDetail {
  /** Stable identifier of the notice. */
  id: string;
  /** Publication date, ISO (`yyyy-mm-dd`). */
  publishedOn: string;
  /** Date shown to the reader, e.g. "04 November 2026". */
  publishedLabel: string;
  /** Notice category. */
  category: string;
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
  attachments: readonly PublicNoticeAttachment[];
}

/** One card of the home "What's Happening" row. */
export interface PublicHomeNotice {
  /** Display date, e.g. "04 NOV 2026". */
  date: string;
  /** Category label rendered in the primary colour. */
  category: string;
  /** Notice headline. */
  title: string;
  /** Supporting copy below the headline. */
  description: string;
  /** Route of the notice detail page. */
  href: string;
  /** Tabs the notice appears under. "Notices" always lists every notice. */
  tabs: readonly string[];
}

/* ---------------------------------------------------------------- gallery --- */

/** One photograph of a public album. */
export interface PublicGalleryPhoto {
  /** Photograph path, either under /public/images or at the file route. */
  src: string;
  /** Alternative text for the photograph. */
  alt: string;
  /** Intrinsic width of the photograph. */
  width: number;
  /** Intrinsic height of the photograph. */
  height: number;
}

/** An album of photographs, as the public gallery shows it. */
export interface PublicGalleryAlbum {
  /** Stable identifier used in the route `/gallery/[albumId]`. */
  id: string;
  /** Album title. */
  title: string;
  /** Publication date, e.g. "12 November 2026". */
  date: string;
  /** Number of photographs in the album. */
  photoCount: number;
  /** Tab the album is filed under. */
  category: string;
  /** Short summary shown under the album title. */
  description: string;
  /** Photographs shown in the album grid and the lightbox. */
  photos: readonly PublicGalleryPhoto[];
}

/* --------------------------------------------------------------- calendar --- */

/** The kinds of entry shown in the calendar legend. */
export const calendarEventKinds = ["Exam", "Holiday", "School event"] as const;

/** A single kind of calendar entry. */
export type CalendarEventKind = (typeof calendarEventKinds)[number];

/** One entry of the public academic calendar. */
export interface PublicCalendarEvent {
  /** Day of the month the event falls on. */
  day: number;
  /** Year the event belongs to. */
  year: number;
  /** Month the event belongs to, 1–12. */
  month: number;
  /** Short label inside the calendar cell. */
  label: string;
  /** Kind of the event, used for the legend colours. */
  kind: CalendarEventKind;
}

/** The events of one month, plus the cards the page shows under the grid. */
export interface PublicCalendarMonth {
  year: number;
  month: number;
  events: readonly PublicCalendarEvent[];
  highlights: readonly { heading: string; detail: string }[];
}

/* ---------------------------------------------------------------- routine --- */

/** One period of the public routine. */
export interface PublicRoutinePeriod {
  /** Period number, e.g. "P1". */
  period: string;
  /** Start time, e.g. "08:00". */
  time: string;
  /** Subject taught in the period. */
  subject: string;
}

/** One day of the public routine. */
export interface PublicRoutineDay {
  /** Short day name, e.g. "Sun". */
  day: string;
  /** Periods taught on that day, in order. */
  periods: readonly PublicRoutinePeriod[];
}

/** A class the routine selector offers. */
export interface PublicRoutineClass {
  /** Id of the class row. */
  id: string;
  /** Name of the class, e.g. "Class 9". */
  name: string;
}

/** The published routine of one class. */
export interface PublicRoutine {
  /** Id of the class the routine belongs to. */
  classId: string;
  /** Name of the class, e.g. "Class 9". */
  className: string;
  /** The date the routine takes effect from, e.g. "01 November 2026". */
  effectiveFrom: string;
  /** The days of the week with their periods. */
  days: readonly PublicRoutineDay[];
}

/* ------------------------------------------------------------------ staff --- */

/** The groups the staff directory filters by. */
export const staffTabs = ["Teachers", "Officers", "Support Staff"] as const;

/** One group of the staff directory. */
export type StaffGroup = (typeof staffTabs)[number];

/** A member of the staff directory, as the public page shows them. */
export interface PublicStaffMember {
  /** Stable identifier used as the React key. */
  id: string;
  /** Full name. */
  name: string;
  /** Role and subject line, e.g. "Senior Teacher · Science". */
  designation: string;
  /** Subject taught, used by the subject filter. */
  subject: string;
  /** Directory the member appears under. */
  group: StaffGroup;
  /** Photograph path inside /public/images. */
  imageSrc: string;
  /** Alternative text for the portrait. */
  imageAlt: string;
  /** Intrinsic width of the portrait. */
  imageWidth: number;
  /** Intrinsic height of the portrait. */
  imageHeight: number;
}

/* ------------------------------------------------------------------ fees --- */

/** One row of the admission fee table, for one class. */
export interface PublicFeeRow {
  /** Name of the class, e.g. "Class 9". */
  className: string;
  /** The admission fee of the class, in taka. */
  admission: string;
  /** The monthly tuition of the class, in taka. */
  tuition: string;
  /** The annual activities fee of the class, in taka. */
  activities: string;
}

/* ------------------------------------------------------------------ home --- */

/** A tile of the quick-access row on the home page. */
export interface PublicQuickLink {
  /** Label shown under the icon. */
  label: string;
  /** Route the tile links to. */
  href: string;
  /** The name of the lucide icon, e.g. "BookOpen". */
  icon: string;
}

/** One figure of the "school at a glance" row. */
export interface PublicSchoolStat {
  /** Headline figure, e.g. "1500+". */
  value: string;
  /** Label beside the figure. */
  label: string;
}

/** A photograph of the home gallery preview. */
export type PublicGalleryMoment = PublicGalleryPhoto;

/** Everything the home page needs from the database. */
export interface PublicHomeData {
  /** The latest notices and events, for the "What's Happening" row. */
  notices: readonly PublicHomeNotice[];
  /** The tiles of the quick-access row. */
  quickLinks: readonly PublicQuickLink[];
  /** The "school at a glance" figures. */
  schoolStats: readonly PublicSchoolStat[];
  /** The photographs of the gallery preview. */
  galleryMoments: readonly PublicGalleryMoment[];
}
