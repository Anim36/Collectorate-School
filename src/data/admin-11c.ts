/**
 * Mock data for the admin fees and audit log pages.
 *
 * Copy, order and geometry mirror the Figma "Admin" frames:
 *   "Admin / Fees"     (2:13668 / 2:13874 / 2:14041 and the dark twins)
 *   "Admin / Audit Log" (2:14191 / 2:14361 / 2:14492 and the dark twins)
 *
 * Nothing here talks to a server: the fees and the audit events keep their
 * edits in memory.
 */

/* ------------------------------------------------------------------ fees --- */

/** The state a payment sits in. */
export type AdminPaymentStatus = "Paid" | "Due" | "Overdue";

/** The options of the payment status filter, in the order Figma lists them. */
export const ADMIN_PAYMENT_STATUSES = [
  "All payment statuses",
  "Paid",
  "Due",
  "Overdue",
] as const;

/** How a payment was made. */
export type AdminPaymentMethod = "bKash" | "Nagad" | "Cash" | "Bank transfer";

/** A payment recorded against a student. */
export interface AdminPayment {
  /** Stable identifier of the payment. */
  readonly id: string;
  /** Name of the student who owes or has paid. */
  readonly student: string;
  /** Invoice number, e.g. "INV-2026-11042". */
  readonly invoice: string;
  /** Amount owed or paid, e.g. "৳ 3,000". */
  readonly amount: string;
  /** Where the payment sits. */
  readonly status: AdminPaymentStatus;
  /** How it was paid. Empty while the payment is still due. */
  readonly method: AdminPaymentMethod | "";
  /** Date the payment falls due, ISO (`yyyy-mm-dd`). */
  readonly dueOn: string;
  /** Date the payment was received, ISO. Empty while it is still due. */
  readonly paidOn: string | "";
  /** Receipt number, e.g. "RCP-2026-4471". Empty while it is still due. */
  readonly receipt: string;
}

/** The payments table of the fees page. */
export const adminPayments: readonly AdminPayment[] = [
  {
    id: "payment-11042",
    student: "Arif Hasan",
    invoice: "INV-2026-11042",
    amount: "৳ 3,000",
    status: "Due",
    method: "",
    dueOn: "2026-11-10",
    paidOn: "",
    receipt: "",
  },
  {
    id: "payment-11043",
    student: "Nusrat Akter",
    invoice: "INV-2026-11043",
    amount: "৳ 1,500",
    status: "Paid",
    method: "bKash",
    dueOn: "2026-11-10",
    paidOn: "2026-11-02",
    receipt: "RCP-2026-4471",
  },
  {
    id: "payment-11044",
    student: "Tanvir Ahmed",
    invoice: "INV-2026-11044",
    amount: "৳ 1,500",
    status: "Paid",
    method: "Nagad",
    dueOn: "2026-11-10",
    paidOn: "2026-11-03",
    receipt: "RCP-2026-4472",
  },
  {
    id: "payment-11045",
    student: "Rumana Islam",
    invoice: "INV-2026-11045",
    amount: "৳ 1,800",
    status: "Overdue",
    method: "",
    dueOn: "2026-10-10",
    paidOn: "",
    receipt: "",
  },
  {
    id: "payment-11046",
    student: "Sabbir Rahman",
    invoice: "INV-2026-11046",
    amount: "৳ 1,800",
    status: "Paid",
    method: "Cash",
    dueOn: "2026-11-10",
    paidOn: "2026-11-04",
    receipt: "RCP-2026-4473",
  },
  {
    id: "payment-11047",
    student: "Mehedi Hasan",
    invoice: "INV-2026-11047",
    amount: "৳ 1,500",
    status: "Due",
    method: "",
    dueOn: "2026-11-10",
    paidOn: "",
    receipt: "",
  },
];

/** A fee line of a class band. */
export interface AdminFeeStructureRow {
  /** Stable identifier of the row. */
  readonly id: string;
  /** The class band the fees apply to, e.g. "6–8". */
  readonly classBand: string;
  /** The monthly tuition of the band, in taka. */
  readonly monthlyTuition: number;
  /** The admission fee of the band, in taka. */
  readonly admissionFee: number;
  /** The activities fee of the band, in taka. */
  readonly activities: number;
  /** The date the fees fall due, ISO (`yyyy-mm-dd`). */
  readonly dueOn: string;
}

/** The fee structure table of the fees page. */
export const adminFeeStructure: readonly AdminFeeStructureRow[] = [
  {
    id: "fee-band-6-8",
    classBand: "6–8",
    monthlyTuition: 1500,
    admissionFee: 5000,
    activities: 1000,
    dueOn: "2026-11-10",
  },
  {
    id: "fee-band-9-10",
    classBand: "9–10",
    monthlyTuition: 1800,
    admissionFee: 6000,
    activities: 1200,
    dueOn: "2026-11-10",
  },
];

/** The summary cards of the fees page. */
export interface AdminFeeMetric {
  /** Card label. */
  readonly label: string;
  /** Card value. */
  readonly value: string;
  /** Supporting copy under the value. */
  readonly hint: string;
}

/** The dues summary of the fees page. */
export const adminFeeMetrics: readonly AdminFeeMetric[] = [
  { label: "Billed", value: "৳ 1M", hint: "November 2026" },
  { label: "Collected", value: "৳ 875K", hint: "87.5% of billed" },
  { label: "Outstanding", value: "৳ 125K", hint: "125 students" },
  { label: "Overdue", value: "৳ 0", hint: "Due 10 November" },
];

/** The number of records held on one page of the payments table. */
export const ADMIN_PAYMENT_PAGE_SIZE = 3;

/** The receipt number the next recorded payment gets. */
export const ADMIN_RECEIPT_PREFIX = "RCP-2026-";

/** The invoice number the next recorded payment gets. */
export const ADMIN_INVOICE_PREFIX = "INV-2026-";

/** The payment methods an admin can record. */
export const ADMIN_PAYMENT_METHODS: readonly AdminPaymentMethod[] = [
  "bKash",
  "Nagad",
  "Cash",
  "Bank transfer",
];

/** Formats a taka amount the way the tables show it, e.g. "৳ 1,500". */
export function formatTaka(amount: number): string {
  return `৳ ${amount.toLocaleString("en-US")}`;
}

/* ----------------------------------------------------------- audit log --- */

/** The kind of change an audit event records. */
export type AdminAuditActionType =
  | "Account"
  | "Result"
  | "Attendance"
  | "Fee"
  | "Notice";

/** The action-type filter options, in the order Figma lists them. */
export const ADMIN_AUDIT_ACTION_TYPES = [
  "All actions",
  "Account",
  "Result",
  "Attendance",
  "Fee",
  "Notice",
] as const;

/** A single recorded change. */
export interface AdminAuditEvent {
  /** Stable identifier of the event. */
  readonly id: string;
  /** When the change happened, e.g. "04 Nov · 10:42". */
  readonly time: string;
  /** Who made the change. */
  readonly user: string;
  /** What they did, e.g. "Saved result draft". */
  readonly action: string;
  /** What they changed, e.g. "Class 9 · Science". */
  readonly record: string;
  /** The kind of change the event belongs to. */
  readonly type: AdminAuditActionType;
}

/**
 * The audit events of the school.
 *
 * The first four are the rows Figma draws (2:14337–2:14356). The rest cover
 * the account creation, the result edits, the attendance edits and the fee
 * changes the PRD asks for, so the pagination and the filters have something
 * to work on.
 */
export const adminAuditEvents: readonly AdminAuditEvent[] = [
  {
    id: "audit-1",
    time: "04 Nov · 10:42",
    user: "Nusrat Jahan",
    action: "Saved result draft",
    record: "Class 9 · Science",
    type: "Result",
  },
  {
    id: "audit-2",
    time: "04 Nov · 10:28",
    user: "Rahim Uddin",
    action: "Created account",
    record: "ST-2026-0042",
    type: "Account",
  },
  {
    id: "audit-3",
    time: "04 Nov · 10:15",
    user: "Arif Hasan",
    action: "Login successful",
    record: "Student portal",
    type: "Account",
  },
  {
    id: "audit-4",
    time: "03 Nov · 14:20",
    user: "Rahim Uddin",
    action: "Published notice",
    record: "NOTICE-2026-104",
    type: "Notice",
  },
  {
    id: "audit-5",
    time: "03 Nov · 13:05",
    user: "Rahim Uddin",
    action: "Updated fee structure",
    record: "Class 9–10 · Tuition",
    type: "Fee",
  },
  {
    id: "audit-6",
    time: "03 Nov · 11:48",
    user: "Shamim Ahmed",
    action: "Edited attendance",
    record: "Class 8 · B · 02 Nov",
    type: "Attendance",
  },
  {
    id: "audit-7",
    time: "02 Nov · 15:32",
    user: "Rahim Uddin",
    action: "Marked fee as paid",
    record: "INV-2026-11043",
    type: "Fee",
  },
  {
    id: "audit-8",
    time: "02 Nov · 12:10",
    user: "Nusrat Jahan",
    action: "Published result",
    record: "Class 9 · Science",
    type: "Result",
  },
  {
    id: "audit-9",
    time: "02 Nov · 09:54",
    user: "Farhana Akter",
    action: "Edited attendance",
    record: "Class 6 · A · 01 Nov",
    type: "Attendance",
  },
  {
    id: "audit-10",
    time: "01 Nov · 16:20",
    user: "Rahim Uddin",
    action: "Deactivated account",
    record: "ST-2026-0031",
    type: "Account",
  },
  {
    id: "audit-11",
    time: "01 Nov · 14:02",
    user: "Sadia Islam",
    action: "Corrected result marks",
    record: "Class 10 · Mathematics",
    type: "Result",
  },
  {
    id: "audit-12",
    time: "01 Nov · 10:35",
    user: "Rahim Uddin",
    action: "Changed fee due date",
    record: "Class 6–8 · November",
    type: "Fee",
  },
];

/** The number of records held on one page of the audit log. */
export const ADMIN_AUDIT_PAGE_SIZE = 4;

/**
 * The date range the audit log opens on.
 *
 * Figma draws "01–04 November 2026" above the table.
 */
export const ADMIN_AUDIT_DATE_RANGE = "01–04 November 2026";
