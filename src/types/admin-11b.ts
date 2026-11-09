/**
 * The types the admin pages share with the server.
 *
 * They are the shapes the services return, kept apart from the services so a
 * client component can use them without pulling the database into the browser
 * bundle.
 */

/** A notice, as the admin list shows it. */
export interface AdminNoticeRow {
  /** The id of the notice. */
  id: string;
  /** The headline. */
  title: string;
  /** The category it is filed under. */
  category: string;
  /** The audiences it is addressed to. */
  audiences: string[];
  /** The publication state. */
  status: "Draft" | "Published";
  /** The date it is published on, ISO (`yyyy-mm-dd`), when it has one. */
  publishedOn: string | null;
  /** The files attached to it. */
  attachments: {
    /** The id of the attachment. */
    id: string;
    /** The name shown in the editor. */
    name: string;
    /** The size shown beside the name. */
    size: string;
    /** The id of the stored file, when the file was really uploaded. */
    fileId: string | null;
  }[];
  /** The body, as sanitised HTML. */
  body: string;
}

/** The list of notices, with the count that matches the filters. */
export interface AdminNoticeList {
  /** The rows of the page. */
  rows: AdminNoticeRow[];
  /** How many notices match the filters, across every page. */
  total: number;
  /** The zero-based page that was read. */
  page: number;
  /** How many rows a page holds. */
  pageSize: number;
  /** How many pages there are. */
  pageCount: number;
}

/** An album, as the admin gallery shows it. */
export interface AdminAlbumRow {
  /** The id of the album. */
  id: string;
  /** The name of the album. */
  title: string;
  /** How many photographs it holds. */
  photoCount: number;
  /** Who the album is visible to. */
  visibility: "Public" | "Teachers";
  /** The category it is filed under. */
  category: string;
}

/** The list of albums. */
export interface AdminAlbumList {
  /** The rows of the list. */
  rows: AdminAlbumRow[];
  /** How many albums match the filters. */
  total: number;
}

/** A photograph in the approval queue. */
export interface AdminPhotoReviewRow {
  /** The id of the photograph. */
  id: string;
  /** The name shown in the queue. */
  name: string;
  /** The album it was uploaded into. */
  album: string;
  /** The size shown beside the name. */
  size: string;
  /** Where the photograph sits in the approval flow. */
  state: "Awaiting admin approval" | "Approved" | "Rejected";
  /** Why the admin sent it back, when it was sent back. */
  reason: string | null;
  /** The id of the stored file, when the file was really uploaded. */
  fileId: string | null;
}

/** One cell of the weekly timetable. */
export interface AdminRoutineCell {
  /** The day of the week, 0 for Sunday through 4 for Thursday. */
  day: number;
  /** The period number, from 1 to 8. */
  period: number;
  /** The subject of the period, when it is filled in. */
  subjectId: string | null;
  /** The name of the subject. */
  subjectName: string | null;
  /** The teacher of the period, when it is filled in. */
  teacherId: string | null;
  /** The name of the teacher. */
  teacherName: string | null;
  /** The time the period starts. */
  startTime: string;
  /** The time the period ends. */
  endTime: string;
}

/** The timetable of a class. */
export interface AdminRoutineSheet {
  /** The id of the class. */
  classId: string;
  /** The name of the class. */
  className: string;
  /** The id of the one section the class carries. */
  sectionId: string;
  /** The date the timetable takes effect from, ISO (`yyyy-mm-dd`). */
  effectiveFrom: string;
  /** Whether the timetable has been published. */
  published: boolean;
  /** The cells of the week. */
  cells: AdminRoutineCell[];
}

/** A class the admin can pick, with the subjects it teaches. */
export interface AdminRoutineClassOption {
  /** The id of the class. */
  id: string;
  /** The name of the class, e.g. "Class 9". */
  name: string;
  /** The subjects that are allocated to the class. */
  subjects: { id: string; name: string }[];
  /** The teachers that can be picked for the class. */
  teachers: { id: string; name: string }[];
}

/** A calendar event, as the admin table shows it. */
export interface AdminCalendarEventRow {
  /** The id of the event. */
  id: string;
  /** The date of the event, ISO (`yyyy-mm-dd`). */
  date: string;
  /** The date shown in the table, e.g. "08 Nov 2026". */
  dateLabel: string;
  /** The title of the event. */
  title: string;
  /** The kind of the event. */
  type: "EXAM" | "HOLIDAY" | "EVENT";
  /** Who the event is addressed to. */
  audience: string;
  /** The last day of the event, when it runs for more than one day. */
  endDate: string | null;
}

/** The list of events, with the count that matches the filters. */
export interface AdminCalendarEventList {
  /** The rows of the page. */
  rows: AdminCalendarEventRow[];
  /** How many events match the filters, across every page. */
  total: number;
  /** The zero-based page that was read. */
  page: number;
  /** How many rows a page holds. */
  pageSize: number;
  /** How many pages there are. */
  pageCount: number;
}
