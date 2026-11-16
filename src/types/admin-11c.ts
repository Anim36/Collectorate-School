/**
 * The types the fees, audit log and dashboard pages share with the server.
 *
 * They are the shapes the services return, kept apart from the services so a
 * client component can use them without pulling the database into the browser
 * bundle.
 *
 * Money is an integer number of poisha on the wire (1 taka = 100 poisha), so
 * no amount ever goes through a float. The pages show taka, so every row
 * carries the formatted string beside the number it was worked out from.
 */

/* ------------------------------------------------------------------ fees --- */

/** A class and the fees its students are charged. */
export interface AdminFeeStructureRow {
  /** The id of the fee structure row. */
  id: string;
  /** The id of the class the structure belongs to. */
  classId: string;
  /** The name of the class, e.g. "Class 9". */
  className: string;
  /** The monthly tuition of the class, in poisha. */
  monthlyTuitionPoisha: number;
  /** The admission fee of the class, in poisha. */
  admissionFeePoisha: number;
  /** The activities fee of the class, in poisha. */
  activitiesPoisha: number;
  /** The date the fees fall due, ISO (`yyyy-mm-dd`). */
  dueDate: string;
}

/** The summary cards of the fees page. */
export interface AdminFeeMetric {
  /** Card label. */
  label: string;
  /** Card value. */
  value: string;
  /** Supporting copy under the value. */
  hint: string;
}

/** Where a fee line sits. */
export type AdminFeeStatus = "Paid" | "Due" | "Overdue";

/** A fee line of a student, as the payments table shows it. */
export interface AdminFeeRow {
  /** The id of the fee line. */
  id: string;
  /** The id of the student row the fee belongs to. */
  studentRowId: string;
  /** The name of the student the fee belongs to. */
  student: string;
  /** The institution-assigned id of the student. */
  studentId: string;
  /** The name of the class of the student. */
  className: string;
  /** The invoice the fee is billed under. */
  invoice: string;
  /** The label of the fee line, e.g. "November tuition". */
  label: string;
  /** The billing slot of the line, e.g. "2026-11:tuition". */
  period: string;
  /** The amount in poisha. */
  amountPoisha: number;
  /** The amount as the table shows it, e.g. "৳ 1,500". */
  amount: string;
  /** Where the fee sits. */
  status: AdminFeeStatus;
  /** How it was paid. Empty while the fee is still due. */
  method: string;
  /** The date the fee falls due, ISO (`yyyy-mm-dd`). */
  dueOn: string;
  /** The date the fee was paid, ISO. Empty while it is still due. */
  paidOn: string;
  /** The receipt number. Empty while the fee is still due. */
  receipt: string;
}

/** The list of fee lines, with the count that matches the filters. */
export interface AdminFeeList {
  /** The rows of the page. */
  rows: AdminFeeRow[];
  /** How many fee lines match the filters, across every page. */
  total: number;
  /** The zero-based page that was read. */
  page: number;
  /** How many rows a page holds. */
  pageSize: number;
  /** How many pages there are. */
  pageCount: number;
}

/** The fees page: the summary, the structure and the payments. */
export interface AdminFeesData {
  /** The summary cards. */
  metrics: AdminFeeMetric[];
  /** The fee structure of every class. */
  structures: AdminFeeStructureRow[];
  /** The fee lines of the first page. */
  payments: AdminFeeList;
  /** The payments that wait for the admin to look at them. */
  pending: AdminPendingPayment[];
}

/**
 * A payment a student submitted that still waits for verification.
 *
 * The admin approves it — the receipt is written and the fees are marked as
 * paid — or rejects it with a reason.
 */
export interface AdminPendingPayment {
  /** The id of the payment row. */
  id: string;
  /** The name of the student who made the payment. */
  student: string;
  /** The institution-assigned id of the student. */
  studentId: string;
  /** The class of the student. */
  className: string;
  /** How the payment was made. */
  method: string;
  /** The identifier the sender quoted. */
  transactionId: string;
  /**
   * The number the money was sent from.
   *
   * The admin sees it in full on the pending screen, so the office can match
   * the payment with the statement of the wallet. It is never written to the
   * audit log in full.
   */
  senderMobile: string;
  /** The amount of the payment, in poisha. */
  amountPoisha: number;
  /** The amount as the list shows it, e.g. "৳ 1,500". */
  amount: string;
  /** The fees the payment settles. */
  feeCount: number;
  /** When the payment was submitted, ISO (`yyyy-mm-dd`). */
  submittedOn: string;
}

/** One fee line of a student that can still be paid. */
export interface AdminPayableFee {
  /** The id of the fee line. */
  id: string;
  /** The label of the line, e.g. "November tuition". */
  label: string;
  /** The amount in poisha. */
  amountPoisha: number;
  /** The amount as the table shows it. */
  amount: string;
  /** The date the line falls due, ISO (`yyyy-mm-dd`). */
  dueOn: string;
  /** The state of the line, worked out from its due date. */
  status: AdminFeeStatus;
}

/** The outstanding fees of one student, with the total they add up to. */
export interface AdminPayableStudent {
  /** The id of the student row. */
  id: string;
  /** The name of the student. */
  name: string;
  /** The institution-assigned id of the student. */
  studentId: string;
  /** The class of the student. */
  className: string;
  /** The lines that can still be paid. */
  fees: AdminPayableFee[];
  /** The sum of the lines, in poisha. */
  totalPoisha: number;
  /** The sum of the lines, as the table shows it. */
  total: string;
}

/* ------------------------------------------------------------- audit log --- */

/**
 * The kinds of change the audit log groups by.
 *
 * The list is closed, so the filter offers the same kinds on every screen and
 * an action that belongs to none of them falls into "Other".
 */
export type AdminAuditActionType =
  | "Account"
  | "Result"
  | "Attendance"
  | "Fee"
  | "Payment"
  | "Notice"
  | "Class"
  | "Subject"
  | "Gallery"
  | "Routine"
  | "Calendar"
  | "File"
  | "Other";

/** A single recorded change. */
export interface AdminAuditEvent {
  /** The id of the event. */
  id: string;
  /** When the change happened, e.g. "04 Nov · 10:42". */
  time: string;
  /** Who made the change. */
  user: string;
  /** What they did, e.g. "Saved result draft". */
  action: string;
  /** What they changed, e.g. "Class 9 · Science". */
  record: string;
  /** The kind of change the event belongs to. */
  type: AdminAuditActionType;
  /**
   * A short, safe summary of the extra detail of the event.
   *
   * It never carries a password, a hash, a token or card data: the rows are
   * redacted before they are read.
   */
  detail: string;
}

/** The list of audit events, with the count that matches the filters. */
export interface AdminAuditList {
  /** The rows of the page. */
  rows: AdminAuditEvent[];
  /** How many events match the filters, across every page. */
  total: number;
  /** The zero-based page that was read. */
  page: number;
  /** How many rows a page holds. */
  pageSize: number;
  /** How many pages there are. */
  pageCount: number;
}

/* ------------------------------------------------------------- dashboard --- */

/** A metric card of the dashboard. */
export interface AdminMetric {
  /** Metric label. */
  label: string;
  /** Metric value. */
  value: string;
  /** Supporting copy under the value. */
  hint: string;
}

/** One month of the fee collection chart. */
export interface AdminFeeMonth {
  /** Month label, e.g. "Jun". */
  label: string;
  /** The amount collected in the month, in poisha. */
  amountPoisha: number;
  /** The amount collected in the month, as the label shows it. */
  amount: string;
  /** Height of the bar in pixels. */
  barHeight: number;
}

/** A row of the "Attention needed" table. */
export interface AdminAttentionRow {
  /** Stable identifier of the row. */
  id: string;
  /** The task that needs attention. */
  task: string;
  /** How many records the task covers. */
  count: string;
  /** The action the admin can take. */
  action: string;
}

/** A row of the "Recent activity" table. */
export interface AdminActivityRow {
  /** Stable identifier of the row. */
  id: string;
  /** When the activity happened. */
  time: string;
  /** Who did it. */
  user: string;
  /** What they did. */
  activity: string;
}

/** Everything the admin dashboard shows. */
export interface AdminDashboardData {
  /** The metric cards. */
  metrics: AdminMetric[];
  /** The six months of the fee collection chart. */
  months: AdminFeeMonth[];
  /** The rows of the "Attention needed" table. */
  attention: AdminAttentionRow[];
  /** The rows of the "Recent activity" table. */
  activity: AdminActivityRow[];
}
