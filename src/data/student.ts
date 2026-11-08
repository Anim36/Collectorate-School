/**
 * Student portal mock data.
 *
 * Copy, order and geometry mirror the Figma "Student / Dashboard",
 * "Student / My Profile", "Student / Attendance", "Student / Performance",
 * "Student / Result" and "Student / Fee Payment" frames (light 2:3613 /
 * 2:3718 / 2:3805, 2:3887 / 2:3979 / 2:4053, 2:4129 / 2:4305 / 2:4463,
 * 2:4620 / 2:4728 / 2:4818, 2:4907 / 2:5012 / 2:5099 and 2:5179 / 2:5282 /
 * 2:5367, plus the matching dark frames).
 */

/** Attendance state of a single school day. */
export type AttendanceStatus = "present" | "absent" | "late" | "holiday";

/** A single day's attendance record. */
export interface AttendanceDay {
  /** Day of the month. */
  day: number;
  /** Attendance state for the day. */
  status: AttendanceStatus;
}

/** A month's attendance, ready for the calendar grid. */
export interface AttendanceMonth {
  /** Year the month belongs to. */
  year: number;
  /** Month number, 1–12. */
  month: number;
  /** Days carrying an attendance record. */
  days: readonly AttendanceDay[];
}

/** The student whose record the portal shows. */
export interface StudentProfile {
  /** Full name. */
  name: string;
  /** Institution-assigned student identifier. */
  studentId: string;
  /** Enrolment status shown beside the identifier. */
  status: string;
  /** Class the student is enrolled in. */
  className: string;
  /** Section within the class. */
  section: string;
  /** Roll number within the section. */
  roll: string;
  /** Date of birth, as Figma writes it. */
  dateOfBirth: string;
  /** Guardian name and relation. */
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

/**
 * The signed-in student.
 * Figma "Student identity" (2:3936) and the profile detail rows.
 */
export const studentProfile: StudentProfile = {
  name: "Arif Hasan",
  studentId: "ST-2026-0042",
  status: "Active student",
  className: "Class 9",
  section: "A",
  roll: "12",
  dateOfBirth: "15 March 2011",
  guardian: "Md. Kamal Hasan · Father",
  guardianPhone: "+880 1712 345678",
  email: "arif.hasan@example.com",
  address: "Dhanmondi, Dhaka 1209",
  emergencyContact: "+880 1812 345678",
  photo: "/images/student.jpg",
};

/** A metric shown in the dashboard's key-metric row. */
export interface StudentMetric {
  /** Metric label. */
  label: string;
  /** Metric value. */
  value: string;
  /** Supporting copy under the value. */
  hint: string;
}

/**
 * The four dashboard metrics.
 * Figma "Key metrics 0" (2:3667 desktop, 2:3733 tablet, 2:3818 mobile).
 */
export const studentMetrics: readonly StudentMetric[] = [
  { label: "Attendance", value: "94.5%", hint: "This academic term" },
  { label: "Last GPA", value: "4.75", hint: "Half-yearly exam" },
  // Figma draws the taka sign and the amount as one unbreakable pair, so the
  // value wraps onto a second line in the narrow tablet card.
  {
    label: "Fee due",
    value: "৳ 3,000",
    hint: "Due 10 November",
  },
  { label: "New notices", value: "3", hint: "Since your last visit" },
];

/** One bar of the dashboard's attendance chart. */
export interface AttendanceTrendPoint {
  /** Month label shown under the bar. */
  label: string;
  /** Attendance rate for the month, 0–100. */
  value: number;
  /**
   * Height of the bar in pixels.
   * Figma draws the bars by hand, so the artwork height is kept rather than
   * derived from the rate.
   */
  barHeight: number;
}

/**
 * The six months of attendance history.
 * Figma "Your attendance at a glance plot" (2:3687 desktop, 2:3753 tablet,
 * 2:3839 mobile).
 */
export const attendanceTrend: readonly AttendanceTrendPoint[] = [
  { label: "Jun", value: 88, barHeight: 130 },
  { label: "Jul", value: 91, barHeight: 144 },
  { label: "Aug", value: 90, barHeight: 126 },
  { label: "Sep", value: 92, barHeight: 152 },
  { label: "Oct", value: 93, barHeight: 160 },
  { label: "Nov", value: 94, barHeight: 164 },
];

/** The welcome panel shown above the dashboard metrics. */
export const studentWelcome = {
  title: "Your next chapter starts today.",
  // Figma's welcome copy runs to one line on desktop and tablet and wraps to
  // three lines on mobile, so the sentence is sized to sit between the two.
  body: "Annual exams begin 01 December. A little progress, every day, adds up to something.",
  actionLabel: "View exam routine",
  actionHref: "/student/result",
} as const;

/** The greeting shown above the dashboard content. */
export const studentGreeting = {
  headline: "Good morning, Arif.",
  context:
    "Class 9 · Section A · Roll 12  /  Wednesday, 04 November 2026",
} as const;

/** A notice row shown in the dashboard's "Recent notices" table. */
export interface StudentNoticeRow {
  /** Stable identifier of the notice. */
  id: string;
  /** Date shown in the first column. */
  date: string;
  /** Category shown in the second column. */
  category: string;
  /** Headline shown in the third column. */
  title: string;
}

/**
 * The three most recent notices.
 * Figma "Data table" (2:3700 desktop, 2:3766 tablet, 2:3852 mobile).
 */
export const studentNoticeRows: readonly StudentNoticeRow[] = [
  {
    id: "annual-examination-schedule",
    date: "04 Nov",
    category: "Academic",
    title: "Annual examination schedule published",
  },
  {
    id: "admissions-2027-open",
    date: "02 Nov",
    category: "Admission",
    title: "Admissions for 2027 are now open",
  },
  {
    id: "science-fair-registration",
    date: "01 Nov",
    category: "Event",
    title: "Science fair registration",
  },
];

/**
 * October 2026 — the month the Figma attendance frame shows.
 * School days carry a status; Fridays and Saturdays are weekly holidays and
 * the remaining unmarked days are outside the school week.
 */
const october2026: AttendanceMonth = {
  year: 2026,
  month: 10,
  days: [
    { day: 1, status: "present" },
    { day: 4, status: "present" },
    { day: 5, status: "present" },
    { day: 6, status: "present" },
    { day: 7, status: "present" },
    { day: 8, status: "present" },
    { day: 11, status: "present" },
    { day: 12, status: "absent" },
    { day: 13, status: "present" },
    { day: 14, status: "present" },
    { day: 15, status: "present" },
    { day: 18, status: "present" },
    { day: 19, status: "present" },
    { day: 20, status: "late" },
    { day: 21, status: "present" },
    { day: 22, status: "present" },
    { day: 25, status: "present" },
    { day: 26, status: "present" },
    { day: 27, status: "present" },
    { day: 28, status: "present" },
    { day: 29, status: "present" },
  ],
};

/**
 * September 2026 — the month the selector moves back to.
 * The pattern repeats with a different set of absences and late days.
 */
const september2026: AttendanceMonth = {
  year: 2026,
  month: 9,
  days: [
    { day: 1, status: "present" },
    { day: 2, status: "present" },
    { day: 3, status: "present" },
    { day: 6, status: "present" },
    { day: 7, status: "late" },
    { day: 8, status: "present" },
    { day: 9, status: "present" },
    { day: 10, status: "present" },
    { day: 13, status: "present" },
    { day: 14, status: "absent" },
    { day: 15, status: "present" },
    { day: 16, status: "present" },
    { day: 17, status: "present" },
    { day: 20, status: "present" },
    { day: 21, status: "present" },
    { day: 22, status: "present" },
    { day: 23, status: "late" },
    { day: 24, status: "present" },
    { day: 27, status: "present" },
    { day: 28, status: "present" },
    { day: 29, status: "present" },
    { day: 30, status: "present" },
  ],
};

/**
 * November 2026 — the month the selector moves forward to.
 */
const november2026: AttendanceMonth = {
  year: 2026,
  month: 11,
  days: [
    { day: 1, status: "holiday" },
    { day: 2, status: "present" },
    { day: 3, status: "present" },
    { day: 4, status: "present" },
    { day: 5, status: "present" },
    { day: 6, status: "present" },
    { day: 9, status: "present" },
    { day: 10, status: "late" },
    { day: 11, status: "present" },
    { day: 12, status: "absent" },
    { day: 13, status: "present" },
    { day: 16, status: "present" },
    { day: 17, status: "present" },
    { day: 18, status: "present" },
    { day: 19, status: "present" },
    { day: 20, status: "present" },
    { day: 23, status: "present" },
    { day: 24, status: "present" },
    { day: 25, status: "present" },
    { day: 26, status: "holiday" },
    { day: 27, status: "present" },
    { day: 30, status: "present" },
  ],
};

/** The months the attendance page can show, in calendar order. */
export const attendanceMonths: readonly AttendanceMonth[] = [
  september2026,
  october2026,
  november2026,
];

/** The month the attendance page opens on. */
export const attendanceInitialMonth = {
  year: 2026,
  month: 10,
} as const;

/** Counts of a month's attendance states. */
export interface AttendanceSummary {
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

/**
 * Counts a month's attendance states.
 * Figma's October summary reads 19 present, 1 absent and 1 late over 21
 * school days, and counts the late arrival towards the 20 attended days
 * behind the 95.2% rate.
 */
export function summariseAttendance(month: AttendanceMonth): AttendanceSummary {
  const schoolDays = month.days.filter(
    (day) => day.status !== "holiday",
  ).length;
  const absent = month.days.filter((day) => day.status === "absent").length;
  const late = month.days.filter((day) => day.status === "late").length;
  const present = month.days.filter((day) => day.status === "present").length;
  const attended = present + late;

  return {
    present,
    absent,
    late,
    attended,
    schoolDays,
    rate:
      schoolDays === 0
        ? "0.0%"
        : `${((attended / schoolDays) * 100).toFixed(1)}%`,
  };
}

/** Month names, indexed 1–12. */
export const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Formats a month the way the Figma selector shows it, e.g. "October 2026". */
export function formatAttendanceMonth(year: number, month: number): string {
  return `${monthNames[month - 1]} ${year}`;
}

/** Returns the attendance record for a month, or undefined when it is unknown. */
export function findAttendanceMonth(
  year: number,
  month: number,
): AttendanceMonth | undefined {
  return attendanceMonths.find(
    (entry) => entry.year === year && entry.month === month,
  );
}

/** One mark on the performance trend line. */
export interface PerformancePoint {
  /** Month label shown under the plot. */
  label: string;
  /** Mark out of 100. */
  value: number;
}

/** One subject's mark in the subject-wise bar list. */
export interface SubjectMark {
  /** Subject name, e.g. "Mathematics". */
  subject: string;
  /** Mark out of 100. */
  mark: number;
}

/**
 * Marks across the six months Figma plots (Jun–Nov).
 *
 * The y-axis runs from 60 to 90, so Figma's four gridlines sit at 90, 80,
 * 70 and 60 marks. The values start at 82 and end at 89, which puts the line
 * in the band between the 90 and 80 rules that Figma draws it in.
 */
export const performanceTrend: readonly PerformancePoint[] = [
  { label: "Jun", value: 82 },
  { label: "Jul", value: 83 },
  { label: "Aug", value: 84 },
  { label: "Sep", value: 85 },
  { label: "Oct", value: 87 },
  { label: "Nov", value: 89 },
];

/**
 * Subject-wise marks.
 * Figma "Subject marks" (2:4697 desktop, 2:4766 tablet, 2:4855 mobile):
 * Bangla 86, English 82, Mathematics 91, Science 88, ICT 76, Religion 81,
 * History 78 and Physical Education 90.
 */
export const subjectMarks: readonly SubjectMark[] = [
  { subject: "Bangla", mark: 86 },
  { subject: "English", mark: 82 },
  { subject: "Mathematics", mark: 91 },
  { subject: "Science", mark: 88 },
  { subject: "ICT", mark: 76 },
  { subject: "Religion", mark: 81 },
  { subject: "History", mark: 78 },
  { subject: "Physical Education", mark: 90 },
];

/** The strength note under the performance charts. */
export const performanceStrength = {
  title: "Your strength",
  body: "Mathematics · Strong problem-solving and steady improvement.",
} as const;

/** The note about the subjects that need attention. */
export const performanceGrowth = {
  title: "Room to grow",
  body: "ICT & History · Short daily revision sessions will close the gap.",
} as const;

/** One subject's row in the result table. */
export interface ResultRow {
  /** Subject name, e.g. "Bangla". */
  subject: string;
  /** Mark out of 100. */
  marks: number;
  /** Letter grade for the mark. */
  grade: string;
  /** Grade point for the mark. */
  gpa: string;
}

/** One exam and the marks it produced. */
export interface ExamResult {
  /** Exam name shown in the selector. */
  label: string;
  /** Marks for every subject in the exam. */
  rows: readonly ResultRow[];
}

/**
 * The exams the student can pick from.
 * Figma shows "Half-yearly examination 2026" first; the other exams give
 * the selector something to switch between.
 */
export const examResults: readonly ExamResult[] = [
  {
    label: "Half-yearly examination 2026",
    rows: [
      { subject: "Bangla", marks: 86, grade: "A+", gpa: "5.00" },
      { subject: "English", marks: 82, grade: "A+", gpa: "5.00" },
      { subject: "Mathematics", marks: 91, grade: "A+", gpa: "5.00" },
      { subject: "Science", marks: 88, grade: "A+", gpa: "5.00" },
      { subject: "ICT", marks: 76, grade: "A", gpa: "4.00" },
      { subject: "Religion", marks: 81, grade: "A+", gpa: "5.00" },
      { subject: "History", marks: 78, grade: "A", gpa: "4.00" },
      { subject: "Physical Education", marks: 90, grade: "A+", gpa: "5.00" },
    ],
  },
  {
    label: "Mid-term examination 2026",
    rows: [
      { subject: "Bangla", marks: 84, grade: "A+", gpa: "5.00" },
      { subject: "English", marks: 80, grade: "A+", gpa: "5.00" },
      { subject: "Mathematics", marks: 89, grade: "A+", gpa: "5.00" },
      { subject: "Science", marks: 85, grade: "A+", gpa: "5.00" },
      { subject: "ICT", marks: 74, grade: "A", gpa: "4.00" },
      { subject: "Religion", marks: 80, grade: "A+", gpa: "5.00" },
      { subject: "History", marks: 77, grade: "A", gpa: "4.00" },
      { subject: "Physical Education", marks: 88, grade: "A+", gpa: "5.00" },
    ],
  },
  {
    label: "Annual examination 2025",
    rows: [
      { subject: "Bangla", marks: 81, grade: "A+", gpa: "5.00" },
      { subject: "English", marks: 78, grade: "A", gpa: "4.00" },
      { subject: "Mathematics", marks: 87, grade: "A+", gpa: "5.00" },
      { subject: "Science", marks: 83, grade: "A+", gpa: "5.00" },
      { subject: "ICT", marks: 72, grade: "A", gpa: "4.00" },
      { subject: "Religion", marks: 79, grade: "A", gpa: "4.00" },
      { subject: "History", marks: 75, grade: "A", gpa: "4.00" },
      { subject: "Physical Education", marks: 86, grade: "A+", gpa: "5.00" },
    ],
  },
];

/** The exam the result page opens on. */
export const initialExamIndex = 0;

/** The headline summary of an exam result. */
export interface ResultSummary {
  /** Average grade point for the exam, e.g. "4.75 / 5.00". */
  gpa: string;
  /** Total marks earned and the maximum, e.g. "Total marks: 672 / 800". */
  totalMarks: string;
  /** Whether every subject was passed, e.g. "Passed all 8 subjects". */
  outcome: string;
}

/**
 * Summarises an exam result.
 * Figma's half-yearly result reads "4.75 / 5.00", "Total marks: 672 / 800"
 * and "Passed all 8 subjects".
 */
export function summariseResult(exam: ExamResult): ResultSummary {
  const total = exam.rows.reduce((sum, row) => sum + row.marks, 0);
  const maximum = exam.rows.length * 100;
  const gpa =
    exam.rows.reduce((sum, row) => sum + Number(row.gpa), 0) / exam.rows.length;

  return {
    gpa: `${gpa.toFixed(2)} / 5.00`,
    totalMarks: `Total marks: ${total} / ${maximum}`,
    outcome: `Passed all ${exam.rows.length} subjects`,
  };
}

/** One fee item that is still outstanding. */
export interface DueFee {
  /** What the fee is for, e.g. "November tuition". */
  item: string;
  /** Date the fee falls due. */
  dueDate: string;
  /** Amount owed, e.g. "৳ 1,500". */
  amount: string;
}

/** One completed payment. */
export interface PaymentRecord {
  /** Receipt number issued for the payment. */
  receipt: string;
  /** Date the payment was made. */
  date: string;
  /** Method used, e.g. "bKash". */
  method: string;
  /** Amount paid, e.g. "৳ 1,500". */
  amount: string;
}

/**
 * The outstanding fees.
 * Figma "Due fees" (2:5246 desktop, 2:5310 tablet, 2:5394 mobile):
 * November tuition and Annual activities, both due 10 Nov 2026.
 */
export const dueFees: readonly DueFee[] = [
  { item: "November tuition", dueDate: "10 Nov 2026", amount: "৳ 1,500" },
  { item: "Annual activities", dueDate: "10 Nov 2026", amount: "৳ 1,500" },
];

/**
 * The payments already made.
 * Figma "Payment history" (2:5263 desktop, 2:5327 tablet, 2:5407 mobile):
 * RCPT-2026-1042 paid by bKash and RCPT-2026-0921 paid by Nagad.
 */
export const paymentHistory: readonly PaymentRecord[] = [
  {
    receipt: "RCPT-2026-1042",
    date: "05 Oct 2026",
    method: "bKash",
    amount: "৳ 1,500",
  },
  {
    receipt: "RCPT-2026-0921",
    date: "06 Sep 2026",
    method: "Nagad",
    amount: "৳ 1,500",
  },
];

/** The fee summary shown in the metric row. */
export const feeSummary = {
  /** Total still owed. */
  totalDue: "৳ 3,000",
  /** When the total falls due. */
  dueHint: "Due 10 November",
  /** Paid so far this year. */
  paidThisYear: "৳ 15,000",
  /** How many payments make up the year's total. */
  paidHint: "10 completed payments",
  /** Date of the next payment. */
  nextPayment: "10 Nov",
  /** What the next payment covers. */
  nextHint: "November tuition",
  /** Whether the fees are outstanding. */
  status: "Due",
  /** Whether a late fee has been added. */
  statusHint: "No late fee applied",
} as const;

/** The payment methods offered in the payment modal. */
export const paymentMethods = [
  { id: "bkash", label: "bKash" },
  { id: "nagad", label: "Nagad" },
  { id: "card", label: "Debit / Credit Card" },
] as const;

/** The payment method the modal opens on. */
export const initialPaymentMethod = "bkash";

/* ------------------------------------------------------- payment mock data --- */

/**
 * A fee item the payment pages can act on.
 * Figma "Due fees" (2:5246 desktop, 2:5310 tablet, 2:5394 mobile) and the
 * receipt card, which settles both items at once for ৳ 3,000.
 */
export interface PayableFee extends DueFee {
  /** Stable identifier used in the `fee` query parameter. */
  readonly id: string;
  /** Amount owed, in taka, without the symbol. */
  readonly value: number;
}

/** The fee items the payment pages can act on. */
export const payableFees: readonly PayableFee[] = [
  {
    id: "november-tuition",
    item: "November tuition",
    dueDate: "10 Nov 2026",
    amount: "৳ 1,500",
    value: 1500,
  },
  {
    id: "annual-activities",
    item: "Annual activities",
    dueDate: "10 Nov 2026",
    amount: "৳ 1,500",
    value: 1500,
  },
];

/**
 * The fee item the "Pay Now" action settles: every outstanding fee at once.
 * Figma "Pay Now · ৳ 3,000" (2:5260 desktop, 2:5324 tablet, 2:5404 mobile).
 */
export const allFeesId = "all-fees";

/** Formats a taka amount the way the tables show it, e.g. "৳ 1,500". */
export function formatTaka(amount: number): string {
  return `৳ ${amount.toLocaleString("en-US")}`;
}

/** One settled payment. */
export interface ReceiptRecord extends PaymentRecord {
  /** Stable identifier used in the receipt route. */
  readonly id: string;
  /** Items the receipt settles. */
  readonly items: readonly PayableFee[];
  /** Total settled, in taka. */
  readonly total: number;
  /** Identifier of the sender's transaction. */
  readonly transactionId: string;
  /** Last four digits of the card, when a card paid. Empty otherwise. */
  readonly cardLast4: string;
}

/**
 * The receipts the mock store starts with.
 * Figma "Payment history" (2:5263 desktop, 2:5327 tablet, 2:5407 mobile):
 * RCPT-2026-1042 paid by bKash and RCPT-2026-0921 paid by Nagad.
 */
const seedReceipts: readonly ReceiptRecord[] = [
  {
    id: "RCPT-2026-1042",
    receipt: "RCPT-2026-1042",
    date: "05 Oct 2026",
    method: "bKash",
    amount: "৳ 1,500",
    items: [
      {
        id: "october-tuition",
        item: "October tuition",
        dueDate: "05 Oct 2026",
        amount: "৳ 1,500",
        value: 1500,
      },
    ],
    total: 1500,
    transactionId: "9F7K2M4XQ1",
    cardLast4: "",
  },
  {
    id: "RCPT-2026-0921",
    receipt: "RCPT-2026-0921",
    date: "06 Sep 2026",
    method: "Nagad",
    amount: "৳ 1,500",
    items: [
      {
        id: "september-tuition",
        item: "September tuition",
        dueDate: "06 Sep 2026",
        amount: "৳ 1,500",
        value: 1500,
      },
    ],
    total: 1500,
    transactionId: "6B3D8N1PL5",
    cardLast4: "",
  },
];

/** The receipt number the next successful payment is issued under. */
const nextReceiptNumber = "RCPT-2026-1104";

/* ------------------------------------------------------------- the store --- */

/** The mock payment state shared by the three fee pages. */
export interface PaymentStore {
  /** The receipts already issued, newest first. */
  readonly receipts: readonly ReceiptRecord[];
  /** Identifiers of the fee items that have been settled. */
  readonly paidFeeIds: readonly string[];
  /** The receipt issued by the last successful payment. */
  readonly lastReceiptId: string | null;
}

/** The store as it starts, before any payment is made. */
const initialPaymentStore: PaymentStore = {
  receipts: seedReceipts,
  paidFeeIds: [],
  lastReceiptId: null,
};

let paymentStore: PaymentStore = initialPaymentStore;

const paymentStoreListeners = new Set<(next: PaymentStore) => void>();

/** The current state of the store. */
export function getPaymentStore(): PaymentStore {
  return paymentStore;
}

/** Subscribes to the store; the callback fires on every change. */
export function subscribeToPaymentStore(
  listener: (next: PaymentStore) => void,
): () => void {
  paymentStoreListeners.add(listener);
  return () => {
    paymentStoreListeners.delete(listener);
  };
}

/** Restores the store to its starting state. */
export function resetPaymentStore(): void {
  paymentStore = initialPaymentStore;
  for (const listener of paymentStoreListeners) listener(paymentStore);
}

/**
 * Records a successful payment.
 *
 * The fee items are marked as paid, so the fees table and the receipt agree.
 * A card number is never stored: only its last four digits are kept.
 */
export function recordPayment(input: {
  /** The fee items the payment settles. */
  readonly items: readonly PayableFee[];
  /** How the payment was made. */
  readonly method: string;
  /** Identifier of the sender's transaction. */
  readonly transactionId: string;
  /** Last four digits of the card, when a card paid. */
  readonly cardLast4: string;
}): ReceiptRecord {
  const total = input.items.reduce((sum, item) => sum + item.value, 0);

  const receipt: ReceiptRecord = {
    id: nextReceiptNumber,
    receipt: nextReceiptNumber,
    date: "04 Nov 2026",
    method: input.method,
    amount: formatTaka(total),
    items: input.items,
    total,
    transactionId: input.transactionId,
    cardLast4: input.cardLast4,
  };

  const paidFeeIds = [
    ...paymentStore.paidFeeIds,
    ...input.items
      .map((item) => item.id)
      .filter((id) => !paymentStore.paidFeeIds.includes(id)),
  ];

  paymentStore = {
    receipts: [receipt, ...paymentStore.receipts],
    paidFeeIds,
    lastReceiptId: receipt.id,
  };

  for (const listener of paymentStoreListeners) listener(paymentStore);

  return receipt;
}

/* -------------------------------------------------------------- selectors --- */

/** The fee items a `fee` query parameter points at. */
export function resolveFeeItems(feeId: string | null): readonly PayableFee[] {
  if (!feeId || feeId === allFeesId) return payableFees;

  const item = payableFees.find((entry) => entry.id === feeId);
  return item ? [item] : payableFees;
}

/** A receipt by its identifier. */
export function findReceipt(
  receiptId: string | null,
): ReceiptRecord | undefined {
  if (!receiptId) return undefined;
  return paymentStore.receipts.find((entry) => entry.id === receiptId);
}

/** The fees that are still owed, after the payments already made. */
export function outstandingFees(): readonly PayableFee[] {
  return payableFees.filter(
    (entry) => !paymentStore.paidFeeIds.includes(entry.id),
  );
}

/** The total still owed, in taka. */
export function outstandingTotal(): number {
  return outstandingFees().reduce((sum, entry) => sum + entry.value, 0);
}

/**
 * The summary the fees page shows, after the payments already made.
 * Figma "Key metrics 0" (2:5228 desktop, 2:5292 tablet, 2:5385 mobile).
 */
export function currentFeeSummary(): {
  /** Total still owed. */
  totalDue: string;
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
  /** Whether a late fee has been added. */
  statusHint: string;
} {
  const outstanding = outstandingFees();

  if (outstanding.length === 0) {
    return {
      totalDue: formatTaka(0),
      dueHint: "All dues cleared",
      paidThisYear: feeSummary.paidThisYear,
      paidHint: feeSummary.paidHint,
      nextPayment: "—",
      nextHint: "Nothing due",
      status: "Paid",
      statusHint: feeSummary.statusHint,
    };
  }

  return {
    totalDue: formatTaka(outstandingTotal()),
    dueHint: feeSummary.dueHint,
    paidThisYear: feeSummary.paidThisYear,
    paidHint: feeSummary.paidHint,
    nextPayment: feeSummary.nextPayment,
    nextHint: outstanding[0].item,
    status: feeSummary.status,
    statusHint: feeSummary.statusHint,
  };
}

/** A row of the fees table, with the state the mock holds it in. */
export interface FeeTableRow extends DueFee {
  /** Stable identifier of the fee item. */
  readonly id: string;
  /** Whether the fee has already been settled. */
  readonly paid: boolean;
}

/**
 * The fees table.
 * Figma "Due fees" (2:5246 desktop, 2:5310 tablet, 2:5394 mobile) keeps both
 * items, so a settled fee stays in the table and is marked as paid.
 */
export function currentDueFees(): readonly FeeTableRow[] {
  return payableFees.map((entry) => ({
    id: entry.id,
    item: entry.item,
    dueDate: entry.dueDate,
    amount: entry.amount,
    paid: paymentStore.paidFeeIds.includes(entry.id),
  }));
}

/** The payment history, newest first. */
export function currentPaymentHistory(): readonly PaymentRecord[] {
  return paymentStore.receipts.map((entry) => ({
    receipt: entry.receipt,
    date: entry.date,
    method: entry.method,
    amount: entry.amount,
  }));
}

/** The signed-in student, as the receipt prints them. */
export function receiptStudent(): {
  /** Full name. */
  name: string;
  /** Institution-assigned student identifier. */
  studentId: string;
  /** Class and section. */
  className: string;
} {
  return {
    name: studentProfile.name,
    studentId: studentProfile.studentId,
    className: `${studentProfile.className} · Section ${studentProfile.section}`,
  };
}
