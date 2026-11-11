/**
 * The types the teacher portal shares with the server.
 *
 * They are the shapes the services return, kept apart from the services so a
 * client component can use them without pulling the database into the browser
 * bundle.
 *
 * The class of a school is one group, so no shape here carries a section: the
 * class names the group ("Class 9", "KG", "Nursery") and the section of the
 * database is an implementation detail of the server.
 */

/* --------------------------------------------------------------- attendance --- */

/** How a student was marked on a sheet. */
export type TeacherAttendanceStatus = "present" | "absent" | "late";

/** A class the teacher takes, as the class selector shows it. */
export interface TeacherClassOption {
  /** The id of the class row. */
  id: string;
  /** The name of the class, e.g. "Class 9". */
  name: string;
  /** Whether the teacher is the class teacher of the class. */
  isClassTeacher: boolean;
}

/** A student on the roll of a class. */
export interface TeacherStudentRow {
  /** The id of the student row. */
  id: string;
  /** The roll number shown in the marking table. */
  roll: number;
  /** The name of the student. */
  name: string;
  /** The portrait shown beside the name. */
  photo: string;
  /** The alternative text of the portrait. */
  photoAlt: string;
}

/** The sheet of one class on one day. */
export interface TeacherAttendanceSheet {
  /** The id of the sheet. */
  id: string;
  /** The id of the class the sheet belongs to. */
  classId: string;
  /** The name of the class, e.g. "Class 9". */
  className: string;
  /** The date of the sheet, ISO (`yyyy-mm-dd`). */
  date: string;
  /** The date shown to the reader, e.g. "04 Nov 2026". */
  dateLabel: string;
  /** The marks of the students, keyed by student id. */
  marks: Readonly<Record<string, TeacherAttendanceStatus>>;
  /** The time the sheet was last saved, e.g. "09:12 AM". */
  savedAt: string;
  /** Whether the sheet is already saved, so it can be opened read-only. */
  saved: boolean;
  /** Whether the sheet may still be edited. */
  editable: boolean;
}

/** One row of the attendance history table. */
export interface TeacherAttendanceHistoryRow {
  /** The id of the sheet. */
  id: string;
  /** The id of the class the sheet belongs to. */
  classId: string;
  /** The name of the class, e.g. "Class 9". */
  className: string;
  /** The date of the sheet, ISO (`yyyy-mm-dd`). */
  date: string;
  /** The date shown to the reader, e.g. "04 Nov 2026". */
  dateLabel: string;
  /** How many students were present. */
  present: number;
  /** How many students were absent. */
  absent: number;
  /** How many students were late. */
  late: number;
  /** The status shown in the table, e.g. "Saved". */
  status: string;
  /** Whether the sheet may still be edited. */
  editable: boolean;
}

/** The attendance page: the classes, the sheet and the history. */
export interface TeacherAttendanceData {
  /** The classes the teacher is the class teacher of. */
  classes: readonly TeacherClassOption[];
  /** The roll of the class that was opened. */
  students: readonly TeacherStudentRow[];
  /** The sheet of the class and the day that were opened. */
  sheet: TeacherAttendanceSheet | null;
  /** The past sheets of the classes of the teacher. */
  history: readonly TeacherAttendanceHistoryRow[];
  /** The days the history holds, newest first, ISO (`yyyy-mm-dd`). */
  historyDays: readonly string[];
  /** The month the history opens on, ISO (`yyyy-mm`). */
  historyMonth: string;
  /** The last day the teacher may mark, ISO (`yyyy-mm-dd`). */
  today: string;
  /** Whether the sheet that is open may still be edited. */
  editable: boolean;
  /** The message the page shows when a sheet cannot be edited. */
  lockedReason: string;
}

/* ------------------------------------------------------------------ results --- */

/** A class the teacher may enter marks for. */
export interface TeacherResultClassOption {
  /** The id of the class row. */
  id: string;
  /** The name of the class, e.g. "Class 9". */
  name: string;
  /** Whether the class reports a grade point. */
  gpa: boolean;
}

/** An exam the teacher may enter marks for. */
export interface TeacherResultExamOption {
  /** The id of the exam row. */
  id: string;
  /** The name of the exam, e.g. "Annual examination 2026". */
  name: string;
}

/** A mark row of the results table. */
export interface TeacherResultRow {
  /** The id of the student row. */
  id: string;
  /** The roll number shown in the table. */
  roll: number;
  /** The name of the student. */
  name: string;
  /** The mark of the student, as it is typed. */
  marks: string;
  /** The letter grade the server worked out. */
  grade: string;
  /** The grade point the server worked out, empty for a grade-only class. */
  gpa: string;
}

/** A mark that cannot be entered. */
export interface TeacherMarkError {
  /** The id of the offending row. */
  rowId: string;
  /** The name of the student, used in the message. */
  studentName: string;
  /** The message shown to the teacher. */
  message: string;
}

/** The results page: the filters, the roster and the sheet. */
export interface TeacherResultData {
  /** The exams the teacher may pick. */
  exams: readonly TeacherResultExamOption[];
  /** The classes the teacher is allocated to. */
  classes: readonly TeacherResultClassOption[];
  /** The subjects the teacher is allocated to. */
  subjects: readonly string[];
  /** The roster of the class that was opened. */
  students: readonly TeacherStudentRow[];
  /** The marks of the students, keyed by student id. */
  marks: Readonly<Record<string, string>>;
  /** The grade of every student, keyed by student id. */
  grades: Readonly<Record<string, string>>;
  /** The grade point of every student, keyed by student id. */
  gpas: Readonly<Record<string, string>>;
  /** Whether the class reports a grade point. */
  gpa: boolean;
  /** Whether the sheet is published, so it is read-only. */
  published: boolean;
  /** The time the sheet was last saved, e.g. "10:42 AM". */
  savedAt: string;
  /** The date the sheet was last saved, e.g. "04 Nov 2026". */
  savedOn: string;
  /** The copy of the guidance panel above the table. */
  guidance: { title: string; body: string };
}

/* ------------------------------------------------------------------- notice --- */

/** A row of the teacher notice table. */
export interface TeacherNoticeRow {
  /** The id of the notice. */
  id: string;
  /** The short date, e.g. "04 Nov". */
  date: string;
  /** The category shown in the table, e.g. "Academic". */
  category: string;
  /** The headline of the notice. */
  notice: string;
}

/** The teacher notice board, with the page that was read. */
export interface TeacherNoticeList {
  /** The rows of the page. */
  rows: readonly TeacherNoticeRow[];
  /** How many notices match the filters. */
  total: number;
  /** The zero-based page that was read. */
  page: number;
  /** How many rows a page holds. */
  pageSize: number;
  /** How many pages there are. */
  pageCount: number;
}

/* ------------------------------------------------------------------ gallery --- */

/** A photograph the teacher sees: one of their own or an approved one. */
export interface TeacherUploadRow {
  /** The id of the photograph. */
  id: string;
  /** The name of the file, as it was uploaded. */
  name: string;
  /** The size of the file, e.g. "2.4 MB". */
  size: string;
  /** Where the photograph is in the approval flow. */
  status: "Awaiting admin approval" | "Approved" | "Sent back";
  /** The album the photograph is in. */
  album: string;
  /** The path of the preview, when the photograph has one. */
  preview: string;
  /** The alternative text of the preview. */
  previewAlt: string;
}

/** The gallery page: the albums, the uploads and the preview. */
export interface TeacherGalleryData {
  /** The albums the teacher can upload into. */
  albums: readonly { id: string; title: string; description: string }[];
  /** The photographs the teacher sees. */
  uploads: readonly TeacherUploadRow[];
  /** The id of the album that is open. */
  albumId: string;
  /** The title of the album that is open. */
  albumTitle: string;
  /** The cover of the album that is open. */
  preview: string;
  /** The alternative text of the cover. */
  previewAlt: string;
  /** The number of photographs the album holds. */
  photoCount: number;
}

/* ---------------------------------------------------------------- dashboard --- */

/** A metric card of the teacher dashboard. */
export interface TeacherDashboardMetric {
  /** The label of the card. */
  label: string;
  /** The value of the card. */
  value: string;
}

/** A row of the dashboard "My classes" table. */
export interface TeacherClassRow {
  /** The name of the class, e.g. "Class 9". */
  className: string;
  /** The subject the teacher takes in the class. */
  subject: string;
  /** The lesson time. */
  time: string;
  /** The room the lesson is held in. */
  room: string;
}

/** A row of the dashboard "Today's attendance" table. */
export interface TeacherAttendanceRow {
  /** The name of the class, e.g. "Class 9". */
  className: string;
  /** How many students are on the roll. */
  students: number;
  /** Whether the sheet of the day has been saved. */
  status: "Pending" | "Submitted";
}

/** A row of the dashboard "Recent notices" table. */
export interface TeacherNoticeSummaryRow {
  /** The short date, e.g. "04 Nov". */
  date: string;
  /** The headline of the notice. */
  notice: string;
}

/** Everything the teacher dashboard shows. */
export interface TeacherDashboardData {
  /** The greeting of the page. */
  greeting: { headline: string; context: string };
  /** The copy of the welcome panel. */
  welcome: { title: string; body: string };
  /** The metric cards. */
  metrics: readonly TeacherDashboardMetric[];
  /** The rows of the "My classes" table. */
  classes: readonly TeacherClassRow[];
  /** The rows of the "Today's attendance" table. */
  attendance: readonly TeacherAttendanceRow[];
  /** The rows of the "Recent notices" table. */
  notices: readonly TeacherNoticeSummaryRow[];
}
