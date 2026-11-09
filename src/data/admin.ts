/**
 * Mock data for the admin portal.
 *
 * The figures and copy mirror the Figma "Admin" frames:
 *   "Admin / Dashboard"      (2:9503 / 2:9700 / 2:9858 and the dark twins)
 *   "Admin / Users"          (2:10002 / 2:10180 / 2:10319 and the dark twins)
 *   "Admin / Add User"       (2:10445 / 2:10651 / 2:10818 and the dark twins)
 *   "Admin / CSV import"     (2:10972 / 2:11161 / 2:11311 and the dark twins)
 *   "Admin / Classes"        (2:11448 / 2:11634 / 2:11781 and the dark twins)
 *
 * Nothing here talks to a server: the admin pages keep their edits in memory.
 */

/** A school account shown in the users table. */
export interface AdminUser {
  /** Stable identifier of the account. */
  readonly id: string;
  /** Full name of the account holder. */
  readonly name: string;
  /** Role of the account. */
  readonly role: AdminUserRole;
  /**
   * The class of a student, the teaching department of a teacher.
   * Empty when the account has neither.
   */
  readonly classOrDept: string;
  /** Whether the account may sign in. */
  readonly status: AdminUserStatus;
  /** Email address of the account. */
  readonly email: string;
}

/** The roles an account can hold. */
export type AdminUserRole = "Student" | "Teacher" | "Admin";

/** The sign-in state of an account. */
export type AdminUserStatus = "Active" | "Inactive";

/** The options of the role filter, in the order Figma lists them. */
export const ADMIN_ROLE_OPTIONS = [
  "All roles",
  "Student",
  "Teacher",
  "Admin",
] as const;

/** The metric cards of the dashboard. */
export interface AdminMetric {
  /** Metric label. */
  readonly label: string;
  /** Metric value. */
  readonly value: string;
  /** Supporting copy under the value. */
  readonly hint: string;
}

/** The dashboard metric row. */
export const adminMetrics: readonly AdminMetric[] = [
  { label: "Students", value: "1,500", hint: "Across 5 classes" },
  { label: "Teachers", value: "60", hint: "Active teaching staff" },
  { label: "Fees collected", value: "৳ 875K", hint: "This month" },
  { label: "Collection rate", value: "87.5%", hint: "৳ 1M billed" },
];

/** The greeting of the admin pages. */
export const adminGreeting = {
  /** Headline of the dashboard. */
  headline: "Your school, at a glance.",
  /** Context line under the headline. */
  context: "Academic year 2026  /  Wednesday, 04 November 2026",
};

/** One month of the fee collection chart. */
export interface AdminFeeMonth {
  /** Month label, e.g. "Jun". */
  readonly label: string;
  /** Collected amount in thousands of taka. */
  readonly value: number;
  /** Height of the bar in pixels, as Figma draws it. */
  readonly barHeight: number;
}

/** The six months of the fee collection chart. */
export const adminFeeMonths: readonly AdminFeeMonth[] = [
  { label: "Jun", value: 720, barHeight: 144 },
  { label: "Jul", value: 810, barHeight: 162 },
  { label: "Aug", value: 780, barHeight: 156 },
  { label: "Sep", value: 850, barHeight: 170 },
  { label: "Oct", value: 910, barHeight: 182 },
  { label: "Nov", value: 875, barHeight: 175 },
];

/** The heading of the fee collection chart. */
export const adminFeeChart = {
  /** Title of the chart. */
  title: "Fees collected · Last 6 months",
  /** Caption under the title. */
  caption: "BDT thousands · Monthly target ৳ 1,000K",
};

/** A row of the "Attention needed" table. */
export interface AdminAttentionRow {
  /** Stable identifier of the row. */
  readonly id: string;
  /** The task that needs attention. */
  readonly task: string;
  /** How many records the task covers. */
  readonly count: string;
  /** The action the admin can take. */
  readonly action: string;
}

/** The "Attention needed" table of the dashboard. */
export const adminAttentionRows: readonly AdminAttentionRow[] = [
  {
    id: "attention-1",
    task: "Unpaid fees",
    count: "125 students",
    action: "Review payments",
  },
  {
    id: "attention-2",
    task: "Draft notices",
    count: "3 notices",
    action: "Continue editing",
  },
  {
    id: "attention-3",
    task: "New admissions",
    count: "24 applications",
    action: "Review applications",
  },
];

/** A row of the "Recent activity" table. */
export interface AdminActivityRow {
  /** Stable identifier of the row. */
  readonly id: string;
  /** When the activity happened. */
  readonly time: string;
  /** Who did it. */
  readonly user: string;
  /** What they did. */
  readonly activity: string;
}

/** The "Recent activity" table of the dashboard. */
export const adminActivityRows: readonly AdminActivityRow[] = [
  {
    id: "activity-1",
    time: "10:42 AM",
    user: "Nusrat Jahan",
    activity: "Saved Science result draft",
  },
  {
    id: "activity-2",
    time: "10:28 AM",
    user: "Rahim Uddin",
    activity: "Created student account",
  },
  {
    id: "activity-3",
    time: "10:15 AM",
    user: "Arif Hasan",
    activity: "Paid November tuition",
  },
];

/** The school accounts shown in the users table. */
export const adminUsers: readonly AdminUser[] = [
  {
    id: "user-1",
    name: "Arif Hasan",
    role: "Student",
    classOrDept: "9 · A",
    status: "Active",
    email: "arif.hasan@example.com",
  },
  {
    id: "user-2",
    name: "Nusrat Jahan",
    role: "Teacher",
    classOrDept: "Science",
    status: "Active",
    email: "nusrat.jahan@example.com",
  },
  {
    id: "user-3",
    name: "Tanvir Ahmed",
    role: "Student",
    classOrDept: "9 · A",
    status: "Active",
    email: "tanvir.ahmed@example.com",
  },
  {
    id: "user-4",
    name: "Farhana Akter",
    role: "Teacher",
    classOrDept: "Mathematics",
    status: "Inactive",
    email: "farhana.akter@example.com",
  },
];

/**
 * The number of accounts the school holds.
 *
 * Figma shows "Showing 1–4 of 1,560 users", so the table counts the whole
 * school while the mock data holds the first page.
 */
export const ADMIN_TOTAL_USERS = 1560;

/** The number of records held on one page of the users table. */
export const ADMIN_USERS_PAGE_SIZE = 4;

/**
 * The teaching departments of the school.
 *
 * The class list is not here: the classes come from the database, so the
 * dropdowns always hold the classes the school actually has.
 */
export const adminDepartments: readonly string[] = [
  "Science",
  "Mathematics",
  "English",
  "Bangla",
  "Social Science",
];

/** A subject and the teacher who takes it. */
export interface AdminSubjectAllocation {
  /** Stable identifier of the allocation. */
  readonly id: string;
  /** Name of the subject. */
  readonly subject: string;
  /** The teacher who takes the subject. */
  readonly teacher: string;
  /** The classes the subject is taught in, e.g. "6–10". */
  readonly classes: string;
}

/** The subject allocation table of the classes page. */
export const adminSubjectAllocations: readonly AdminSubjectAllocation[] = [
  {
    id: "subject-1",
    subject: "Mathematics",
    teacher: "Farhana Akter",
    classes: "6–10",
  },
  {
    id: "subject-2",
    subject: "Science",
    teacher: "Nusrat Jahan",
    classes: "6–9",
  },
  {
    id: "subject-3",
    subject: "English",
    teacher: "Shamim Ahmed",
    classes: "6–10",
  },
];

/** The teachers that can take a class or a subject. */
export const adminTeachers: readonly string[] = [
  "Farhana Akter",
  "Nusrat Jahan",
  "Shamim Ahmed",
  "Sadia Islam",
  "Rafiq Hasan",
];

/** The subjects the school teaches. */
export const adminSubjects: readonly string[] = [
  "Mathematics",
  "Science",
  "English",
  "Bangla",
  "Social Science",
  "Islam",
];

/** A row of the CSV import preview table. */
export interface AdminCsvRow {
  /** Row number in the uploaded file. */
  readonly row: number;
  /** Name of the account. */
  readonly name: string;
  /** Role of the account. */
  readonly role: AdminUserRole;
  /** Class of the account. */
  readonly classOrDept: string;
  /** Email address of the account. */
  readonly email: string;
  /** Whether the row can be imported. */
  readonly valid: boolean;
  /** Why the row cannot be imported. */
  readonly problem?: string;
}

/** The rows of the sample CSV, as the preview table shows them. */
export const adminCsvPreviewRows: readonly AdminCsvRow[] = [
  {
    row: 1,
    name: "Tanvir Ahmed",
    role: "Student",
    classOrDept: "Class 9 · A",
    email: "tanvir.ahmed@example.com",
    valid: true,
  },
  {
    row: 2,
    name: "Rumana Islam",
    role: "Student",
    classOrDept: "Class 9 · A",
    email: "rumana.islam@example.com",
    valid: true,
  },
  {
    row: 3,
    name: "Sabbir Rahman",
    role: "Student",
    classOrDept: "Class 9 · B",
    email: "sabbir.rahman@example.com",
    valid: true,
  },
  {
    row: 4,
    name: "Mehedi Hasan",
    role: "Student",
    classOrDept: "Class 9 · B",
    email: "mehedi.hasan@example.com",
    valid: true,
  },
  {
    row: 5,
    name: "Nusrat Jahan",
    role: "Teacher",
    classOrDept: "Science",
    email: "nusrat.jahan@example.com",
    valid: true,
  },
  {
    row: 6,
    name: "Shamim Ahmed",
    role: "Teacher",
    classOrDept: "English",
    email: "shamim.ahmed@example.com",
    valid: true,
  },
  {
    row: 7,
    name: "Farhana Akter",
    role: "Teacher",
    classOrDept: "Mathematics",
    email: "farhana.akter@example.com",
    valid: true,
  },
  {
    row: 8,
    name: "Sadia Islam",
    role: "Teacher",
    classOrDept: "Social Science",
    email: "sadia.islam@example.com",
    valid: true,
  },
  {
    row: 9,
    name: "Rafiq Hasan",
    role: "Teacher",
    classOrDept: "Bangla",
    email: "rafiq.hasan@example.com",
    valid: true,
  },
  {
    row: 10,
    name: "Jahangir Alam",
    role: "Teacher",
    classOrDept: "Islam",
    email: "jahangir.alam@example.com",
    valid: true,
  },
];

/** The file the CSV preview describes. */
export const adminCsvFile = {
  /** Name of the file. */
  name: "students-class-9.csv",
  /** Number of rows the file holds. */
  rows: 32,
  /** Number of rows that can be imported. */
  ready: 31,
  /** The problem found in the file. */
  warning: "⚠ Row 17: email address is missing",
};

/** The minimum length of a temporary password. */
export const ADMIN_PASSWORD_MIN_LENGTH = 12;

/**
 * The school roster.
 *
 * The first four accounts are the ones Figma draws in the users table
 * (2:10154–2:10172). The rest of the roll is generated so the pagination and
 * the filters work on a realistic number of accounts: 1,500 students and 60
 * teachers, which is the 1,560 the Figma footer counts.
 *
 * The roster is no longer drawn: the users table reads the accounts from the
 * database, so the real roll is what it shows.
 */
const ROSTER_FIRST_NAMES = [
  "Arif",
  "Nusrat",
  "Tanvir",
  "Farhana",
  "Shamim",
  "Sadia",
  "Rafiq",
  "Rumana",
  "Sabbir",
  "Mehedi",
  "Jahangir",
  "Rupa",
  "Tania",
  "Imran",
  "Sohel",
  "Nasrin",
  "Mizan",
  "Habib",
  "Asma",
  "Rifat",
  "Kamrul",
  "Salma",
  "Javed",
  "Rehana",
  "Morjina",
  "Anwar",
  "Shirin",
  "Kamal",
  "Nabila",
  "Ziaul",
  "Ruma",
  "Masud",
] as const;

const ROSTER_LAST_NAMES = [
  "Hasan",
  "Jahan",
  "Ahmed",
  "Akter",
  "Islam",
  "Hasan",
  "Islam",
  "Islam",
  "Rahman",
  "Islam",
  "Alam",
  "Begum",
  "Rahman",
  "Khan",
  "Ali",
  "Begum",
  "Haque",
  "Miah",
  "Begum",
  "Hasan",
  "Islam",
  "Begum",
  "Hossain",
  "Begum",
  "Khatun",
  "Uddin",
  "Akter",
  "Rahman",
  "Chowdhury",
  "Khan",
  "Begum",
  "Hasan",
] as const;

const ROSTER_CLASS_NUMBERS = [6, 7, 8, 9, 10] as const;
const ROSTER_SECTIONS = ["A", "B", "C"] as const;

/**
 * Builds the account the roster holds at a given index.
 *
 * The roster is not drawn by the pages any more — the users table reads the
 * accounts from the database — so this is only kept for the design-system
 * page, which still shows the shape of a long roll.
 */
function buildRosterUser(index: number): AdminUser {
  // Every twenty-seventh generated account is a teacher, so the roll holds
  // 58 generated teachers beside the two Figma draws.
  const role: AdminUserRole = (index - 4) % 27 === 0 ? "Teacher" : "Student";

  // The first name walks the list and the last name walks it a step further,
  // so the generated names do not repeat as often as a single list would.
  const first = ROSTER_FIRST_NAMES[index % ROSTER_FIRST_NAMES.length];
  const last = ROSTER_LAST_NAMES[(index * 7) % ROSTER_LAST_NAMES.length];

  const classOrDept =
    role === "Teacher"
      ? adminDepartments[index % adminDepartments.length]
      : `${ROSTER_CLASS_NUMBERS[index % ROSTER_CLASS_NUMBERS.length]} · ${
          ROSTER_SECTIONS[index % ROSTER_SECTIONS.length]
        }`;

  return {
    id: `user-${index + 1}`,
    name: `${first} ${last}`,
    role,
    classOrDept,
    status: index % 37 === 0 ? "Inactive" : "Active",
    email: `${first}.${last}.${index + 1}@example.com`.toLowerCase(),
  };
}

/** The whole roster — the first four accounts are the Figma draws. */
export const adminRoster: readonly AdminUser[] = [
  ...adminUsers,
  ...Array.from({ length: ADMIN_TOTAL_USERS - adminUsers.length }, (_, offset) =>
    buildRosterUser(offset + adminUsers.length),
  ),
];
