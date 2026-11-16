/**
 * The types the student portal pages share with the server.
 *
 * They are the shapes the services return, kept apart from the services so a
 * client component can use them without pulling the database into the browser
 * bundle.
 *
 * Money is an integer number of poisha on the wire (1 taka = 100 poisha), so
 * no amount ever goes through a float. The pages show taka, so every row
 * carries the formatted string beside the number it was worked out from.
 */

import type { GalleryAlbum } from "@/types/gallery";
import type { NoticeArticleData } from "@/types/notice";

/* --------------------------------------------------------------- profile --- */

/** The student the portal shows, as the profile page reads it. */
export interface StudentProfile {
  /** Full name. */
  name: string;
  /** Institution-assigned student identifier. */
  studentId: string;
  /** Enrolment status shown beside the identifier. */
  status: string;
  /** Class the student is enrolled in. */
  className: string;
  /** Roll number within the class. */
  roll: string;
  /** Date of birth, as the page writes it. */
  dateOfBirth: string;
  /** Guardian name. */
  guardian: string;
  /** Guardian phone number. */
  guardianPhone: string;
  /** Student email address. */
  email: string;
  /** Home address. */
  address: string;
  /** Emergency contact phone number. */
  emergencyContact: string;
  /** Portrait path. */
  photo: string;
}

/* ------------------------------------------------------------ attendance --- */

/** Attendance state of a single school day. */
export type StudentAttendanceStatus = "present" | "absent" | "late" | "holiday";

/** Counts of a month's attendance states. */
export interface StudentAttendanceSummary {
  /** Days the student was marked present. */
  present: number;
  /** Days the student missed. */
  absent: number;
  /** Days the student arrived late. */
  late: number;
  /** Days the student attended, late arrivals included. */
  attended: number;
  /** School days counted in the month. */
  schoolDays: number;
  /** Attendance rate as a percentage, to one decimal place. */
  rate: string;
}

/** A month of attendance, ready for the calendar grid. */
export interface StudentAttendanceMonth {
  /** Year the month belongs to. */
  year: number;
  /** Month number, 1–12. */
  month: number;
  /** Days carrying an attendance record. */
  days: readonly {
    /** Day of the month. */
    day: number;
    /** Attendance state for the day. */
    status: StudentAttendanceStatus;
  }[];
  /**
   * The days of the month the school closed.
   *
   * They come from the school calendar, so a day the school was closed shows
   * a dash even when no attendance was marked for it.
   */
  holidayDays: readonly number[];
  /** The counts of the month. */
  summary: StudentAttendanceSummary;
}

/** A month the attendance page can show, named by its year and month. */
export interface StudentAttendanceMonthOption {
  /** Year the month belongs to. */
  year: number;
  /** Month number, 1–12. */
  month: number;
  /** The label the selector shows, e.g. "October 2026". */
  label: string;
}

/** One bar of the dashboard's attendance chart. */
export interface StudentAttendanceTrendPoint {
  /** Month label shown under the bar. */
  label: string;
  /** Attendance rate for the month, 0–100. */
  value: number;
  /** Height of the bar in pixels. */
  barHeight: number;
}

/* ----------------------------------------------------------- performance --- */

/** One mark on the performance trend line. */
export interface StudentPerformancePoint {
  /** Label shown under the plot. */
  label: string;
  /** Mark out of 100. */
  value: number;
}

/** One subject's mark in the subject-wise bar list. */
export interface StudentSubjectMark {
  /** Subject name, e.g. "Mathematics". */
  subject: string;
  /** Mark out of 100. */
  mark: number;
}

/* ---------------------------------------------------------------- result --- */

/** An exam the student can pick from in the result selector. */
export interface StudentExamOption {
  /** Id of the exam, used by the selector. */
  id: string;
  /** Exam name shown in the selector. */
  label: string;
  /** Whether the class is graded on grades only, so no marks are shown. */
  gradeOnly: boolean;
}

/** One subject's row in the result table. */
export interface StudentResultRow {
  /** Subject name, e.g. "Bangla". */
  subject: string;
  /** Mark out of 100. Empty when the class is graded on grades only. */
  marks: string;
  /** Letter grade for the mark. */
  grade: string;
  /** Grade point for the mark. Empty when the class is graded on grades only. */
  gpa: string;
}

/** One exam and the marks it produced. */
export interface StudentExamResult {
  /** Id of the exam, used by the selector. */
  id: string;
  /** Exam name shown in the selector. */
  label: string;
  /** Marks for every subject in the exam. */
  rows: readonly StudentResultRow[];
  /** Average grade point for the exam, e.g. "4.75 / 5.00". */
  gpa: string;
  /** Total marks earned and the maximum, e.g. "Total marks: 672 / 800". */
  totalMarks: string;
  /** Whether every subject was passed, e.g. "Passed all 8 subjects". */
  outcome: string;
  /** Whether the class is graded on grades only, so no marks are shown. */
  gradeOnly: boolean;
}

/** Everything the performance page shows. */
export interface StudentPerformanceData {
  /** The four key metrics. */
  metrics: readonly {
    /** Metric label. */
    label: string;
    /** Metric value. */
    value: string;
    /** Supporting copy under the value. */
    hint: string;
  }[];
  /** One mark per exam, in the order the exams were sat. */
  trend: readonly StudentPerformancePoint[];
  /** The marks of the latest published exam, subject by subject. */
  marks: readonly StudentSubjectMark[];
  /** The two notes under the charts. */
  notes: {
    /** The note about the subject the student is strongest in. */
    strength: { title: string; body: string };
    /** The note about the subject that needs work. */
    growth: { title: string; body: string };
  };
}

/* ------------------------------------------------------------------ fees --- */

/** Where a fee line sits, as the student sees it. */
export type StudentFeeStatus = "Paid" | "Due" | "Overdue" | "Pending verification";

/** A fee line of the signed-in student. */
export interface StudentFeeRow {
  /** The id of the fee line. */
  id: string;
  /** What the fee is for, e.g. "November tuition". */
  item: string;
  /** Date the fee falls due, e.g. "10 Nov 2026". */
  dueDate: string;
  /** Amount owed, e.g. "৳ 1,500". */
  amount: string;
  /** The amount in poisha. */
  amountPoisha: number;
  /** Where the line sits. */
  status: StudentFeeStatus;
  /** Whether the line can still be paid. */
  payable: boolean;
}

/** A fee line the student may still pay. */
export interface StudentPayableFee {
  /** The id of the fee line. */
  id: string;
  /** What the fee is for, e.g. "November tuition". */
  item: string;
  /** Date the fee falls due, e.g. "10 Nov 2026". */
  dueDate: string;
  /** Amount owed, e.g. "৳ 1,500". */
  amount: string;
  /** The amount in poisha. */
  amountPoisha: number;
}

/** One payment of the signed-in student. */
export interface StudentPaymentRow {
  /** Id of the payment row. */
  id: string;
  /**
   * Id of the receipt the payment produced.
   *
   * It is empty while the payment still waits for the admin, because a receipt
   * is only written when the admin approves the payment.
   */
  receiptId: string;
  /** Receipt number issued for the payment. Empty while it waits. */
  receipt: string;
  /** Date the payment was made, e.g. "05 Oct 2026". */
  date: string;
  /** Method used, e.g. "bKash". */
  method: string;
  /** Amount paid, e.g. "৳ 1,500". */
  amount: string;
  /** The amount in poisha. */
  amountPoisha: number;
  /** Where the payment sits, as the student sees it. */
  status: string;
}

/** The summary the fees page shows in the metric row. */
export interface StudentFeeSummary {
  /** Total still owed. */
  totalDue: string;
  /** The total still owed, in poisha. */
  totalDuePoisha: number;
  /** When the total falls due. */
  dueHint: string;
  /** Paid so far this year. */
  paidThisYear: string;
  /** How many payments make up the year's total. */
  paidHint: string;
  /** Date of the next payment. */
  nextPayment: string;
  /** What the next payment covers. */
  nextHint: string;
  /** Whether the fees are outstanding. */
  status: string;
  /** Whether a late fee has been applied. */
  statusHint: string;
}

/** Everything the fee pages show. */
export interface StudentFeesData {
  /** The summary the metric row shows. */
  summary: StudentFeeSummary;
  /** The fee lines of the student. */
  fees: readonly StudentFeeRow[];
  /** The payments the student has made. */
  payments: readonly StudentPaymentRow[];
}

/** The receipt of a paid payment, as the receipt page shows it. */
export interface StudentReceiptData {
  /** Id of the receipt row. */
  id: string;
  /** The receipt number, as it appears on the receipt. */
  receiptNumber: string;
  /** Date the payment was made. */
  paidOn: string;
  /** How the payment was made. */
  method: string;
  /** Identifier of the sender's transaction. */
  transactionId: string;
  /** Last four digits of the card, when a card paid. */
  cardLast4: string;
  /** The number the money was sent from, when a wallet paid. */
  senderMobile: string;
  /** The items the receipt settles. */
  items: readonly {
    /** What the fee is for. */
    item: string;
    /** Date the fee fell due. */
    dueDate: string;
    /** Amount paid, e.g. "৳ 1,500". */
    amount: string;
  }[];
  /** Total paid, in poisha. */
  totalPoisha: number;
  /** The student the receipt belongs to. */
  student: {
    /** Full name. */
    name: string;
    /** Institution-assigned student identifier. */
    studentId: string;
    /** The class of the student. */
    className: string;
  };
}

/* ---------------------------------------------------------------- notice --- */

/** A notice row shown in the portal tables. */
export interface StudentNoticeRow {
  /** Stable identifier of the notice. */
  id: string;
  /** Date shown in the first column, e.g. "04 Nov". */
  date: string;
  /** Publication date, ISO (`yyyy-mm-dd`). */
  publishedOn: string;
  /** Category shown in the second column. */
  category: string;
  /** Headline shown in the third column. */
  title: string;
  /**
   * The plain text of the notice.
   *
   * The board searches over it, so the reader can find a notice by a word of
   * its body. The markup is left behind on the server.
   */
  searchText: string;
}

/**
 * The notice board of the student, with the page it shows.
 */
export interface StudentNoticeBoard {
  /** The notices of the page. */
  rows: readonly StudentNoticeRow[];
  /** The number of notices that match the filters. */
  total: number;
  /** The zero-based index of the visible page. */
  page: number;
  /** The number of notices on a page. */
  pageSize: number;
  /** The number of pages the filters produce. */
  pageCount: number;
  /** The categories the filter offers, the first being the reset value. */
  categories: readonly string[];
}

/**
 * The filters of the student notice board.
 *
 * The browser may ask for any of them, but the server checks them against
 * the same rules before they reach the database.
 */
export interface StudentNoticeFilterInput {
  /** The free-text search over the headline and the body. */
  query?: string;
  /** The category the filter is set to. */
  category?: string;
  /** The first day of the window, ISO (`yyyy-mm-dd`). */
  from?: string;
  /** The last day of the window, ISO (`yyyy-mm-dd`). */
  to?: string;
  /** The zero-based index of the visible page. */
  page?: number;
  /** The number of notices on a page. */
  pageSize?: number;
}


/**
 * A notice the student is allowed to read, with its attachments.
 *
 * The article part is the shape the article and the attachment table share, so
 * the student page renders a notice exactly the way the public page does.
 */
export interface StudentNoticeDetail extends NoticeArticleData {
  /** Publication date, ISO (`yyyy-mm-dd`). */
  publishedOn: string;
  /** Date shown to the reader, e.g. "04 Nov 2026". */
  publishedLabel: string;
  /** Notice category. */
  category: string;
}

/* --------------------------------------------------------------- gallery --- */

/**
 * An album of photographs, as the student gallery shows it.
 *
 * It is the shared album shape, so the grid and the lightbox the public
 * gallery uses render it without a second set of components.
 */
export interface StudentGalleryAlbum extends GalleryAlbum {
  /** Stable identifier used in the route `/student/gallery/[albumId]`. */
  id: string;
}

/* ------------------------------------------------------------- dashboard --- */

/** Everything the student dashboard shows. */
export interface StudentDashboardData {
  /** The greeting above the dashboard content. */
  greeting: {
    /** The headline of the greeting. */
    headline: string;
    /** The context line under the headline. */
    context: string;
  };
  /** The four key metrics. */
  metrics: readonly {
    /** Metric label. */
    label: string;
    /** Metric value. */
    value: string;
    /** Supporting copy under the value. */
    hint: string;
  }[];
  /** The bars of the attendance chart. */
  attendanceTrend: readonly StudentAttendanceTrendPoint[];
  /** The most recent notices. */
  notices: readonly StudentNoticeRow[];
}
