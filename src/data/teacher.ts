/**
 * Teacher portal mock data.
 *
 * Copy, order and counts mirror the Figma "Teacher / Dashboard"
 * (light 2:6341 desktop, 2:6537 tablet, 2:6701 mobile) and
 * "Teacher / Attendance Sheet" (light 2:6847 desktop, 2:7061 tablet,
 * 2:7243 mobile), "Teacher / Attendance history" (light 2:7419 desktop,
 * 2:7581 tablet, 2:7711 mobile) and the matching dark frames.
 */

/** The teacher signed in to the portal. */
export interface TeacherProfile {
  /** Name shown in the top bar and the greeting. */
  readonly name: string;
  /** Department shown in the context line. */
  readonly department: string;
  /** Subject the teacher is responsible for. */
  readonly subject: string;
  /** Portrait shown in the top bar. */
  readonly photo: string;
  /** Alternative text for the portrait. */
  readonly photoAlt: string;
}

/** The signed-in teacher. */
export const teacherProfile: TeacherProfile = {
  name: "Nusrat Jahan",
  department: "Science department",
  subject: "Science",
  photo: "/images/teacher.jpg",
  photoAlt: "Portrait of Nusrat Jahan",
};

/** A class the teacher teaches. */
export interface TeacherClass {
  /** Stable identifier used by the class and section selects. */
  readonly id: string;
  /** Class label, e.g. "Class 9". */
  readonly label: string;
  /** Sections the class is split into. */
  readonly sections: readonly string[];
  /** Subject taught to the class. */
  readonly subject: string;
  /** Lesson time on the timetable. */
  readonly time: string;
  /** Room the lesson is held in. */
  readonly room: string;
}

/**
 * The classes the teacher is assigned to.
 * Figma "Teacher metrics" (2:6471) counts three of them.
 */
export const teacherClasses: readonly TeacherClass[] = [
  {
    id: "class-9",
    label: "Class 9",
    sections: ["A", "B"],
    subject: "Science",
    time: "08:00–08:45",
    room: "Lab 1",
  },
  {
    id: "class-8",
    label: "Class 8",
    sections: ["A", "B"],
    subject: "Science",
    time: "09:30–10:15",
    room: "204",
  },
  {
    id: "class-10",
    label: "Class 10",
    sections: ["A"],
    subject: "Physics",
    time: "11:30–12:15",
    room: "Lab 2",
  },
];

/** How a student was marked on a sheet. */
export type AttendanceStatus = "present" | "absent" | "late";

/** A student on a class roll. */
export interface TeacherStudent {
  /** Stable identifier for the student. */
  readonly id: string;
  /** Roll number shown in the marking table. */
  readonly roll: number;
  /** Student name. */
  readonly name: string;
  /** Portrait shown beside the name. */
  readonly photo: string;
  /** Alternative text for the portrait. */
  readonly photoAlt: string;
}

/** A roll of students for one class section. */
export interface TeacherRoll {
  /** Class the roll belongs to. */
  readonly classId: string;
  /** Section of the roll. */
  readonly section: string;
  /** The students on the roll, in roll order. */
  readonly students: readonly TeacherStudent[];
}

/** Builds a roll of students from a list of names. */
function buildRoll(
  classId: string,
  section: string,
  names: readonly string[],
  firstRoll: number,
): TeacherRoll {
  return {
    classId,
    section,
    students: names.map((name, index) => ({
      id: `${classId}-${section}-${firstRoll + index}`,
      roll: firstRoll + index,
      name,
      photo: "/images/student.jpg",
      photoAlt: `Portrait of ${name}`,
    })),
  };
}

/**
 * The rolls the teacher marks.
 *
 * Figma "Attendance marking table" (2:7000) shows five of thirty-two students
 * for Class 9 · A on the first page, so the rolls carry a full class and the
 * table pages through it.
 */
export const teacherRolls: readonly TeacherRoll[] = [
  buildRoll("class-9", "A", [
    "Arif Hasan",
    "Nusrat Akter",
    "Tanvir Ahmed",
    "Sadia Rahman",
    "Rafi Islam",
    "Farhana Akter",
    "Imran Kabir",
    "Tania Sultana",
    "Shahriar Alam",
    "Mitu Akter",
    "Rimon Islam",
    "Jannat Akter",
    "Sakib Hasan",
    "Nabila Yasmin",
    "Rubel Mia",
    "Sabina Yasmin",
    "Al Amin Chowdhury",
    "Rehnuma Begum",
    "Asif Iqbal",
    "Sumaiya Khatun",
    "Mehedi Hasan",
    "Lamia Sultana",
    "Raihan Chowdhury",
    "Zarin Tasnim",
    "Nayeem Rahman",
    "Sadia Islam",
    "Fahim Reza",
    "Tahmina Akter",
    "Rashedul Islam",
    "Morjina Khatun",
    "Shafiq Alam",
    "Nusrat Jahan",
  ], 12),
  buildRoll("class-9", "B", [
    "Abdul Karim",
    "Shirin Akter",
    "Mizanur Rahman",
    "Rokeya Sultana",
    "Jahangir Alam",
    "Kamrun Nahar",
    "Sohel Rana",
    "Nazma Khatun",
    "Aminul Haque",
    "Shamima Akter",
    "Debashish Roy",
    "Beauty Akter",
    "Mizanur Hasan",
    "Farhana Khatun",
    "Nayeem Uddin",
    "Rukhsana Begum",
    "Mamunur Rashid",
    "Sohela Akter",
    "Anwar Hossain",
    "Shirin Sultana",
    "Habibur Rahman",
    "Roksana Khatun",
    "Ashraful Alam",
    "Morjina Akter",
    "Julfikar Alam",
    "Rokeya Khatun",
    "Badrul Alam",
    "Shahida Begum",
    "Kamrul Hasan",
    "Ripa Akter",
    "Nirmal Roy",
    "Rupali Khatun",
  ], 1),
  buildRoll("class-8", "A", [
    "Joyita Roy",
    "Nahid Islam",
    "Rafiqul Hasan",
    "Shamima Khatun",
    "Badshah Mia",
    "Momena Khatun",
    "Shafiq Alam",
    "Rokeya Sultana",
    "Azizul Haque",
    "Ruma Khatun",
    "Junaid Alam",
    "Shirin Sultana",
  ], 1),
  buildRoll("class-8", "B", [
    "Hasan Ali",
    "Morjina Akter",
    "Sohel Mia",
    "Rokeya Begum",
    "Kamal Uddin",
    "Shamima Akter",
    "Ripon Islam",
    "Nazma Khatun",
    "Amir Hossain",
    "Ruma Akter",
    "Jashim Uddin",
    "Rabiya Khatun",
    "Shafik Alam",
    "Nasima Khatun",
    "Rubel Mia",
    "Shirin Akter",
    "Kamal Hossain",
    "Momena Sultana",
    "Akramul Islam",
    "Shahnaz Begum",
    "Rasel Chowdhury",
    "Farhana Alam",
    "Jahir Mia",
    "Rokeya Khatun",
    "Shafiq Uddin",
    "Nurjahan Akter",
    "Badshah Alam",
    "Rina Sultana",
    "Tarique Islam",
    "Shamim Akter",
  ], 1),
  buildRoll("class-10", "A", [
    "Ayesha Siddiqua",
    "Tanvir Hasan",
    "Sadia Islam",
    "Rafiul Hasan",
    "Nabila Chowdhury",
    "Shafin Alam",
    "Momena Akter",
    "Junaid Siddique",
    "Rupali Hasan",
    "Emran Chowdhury",
    "Sabrina Yasmin",
    "Rifat Hasan",
    "Farzana Akter",
    "Shafik Islam",
    "Nayeem Hossain",
    "Tahmina Khatun",
    "Rasel Mia",
    "Shirina Akter",
    "Anisur Rahman",
    "Mehnaz Chowdhury",
    "Kamrul Hasan",
    "Sumaiya Akter",
    "Rubel Mia",
    "Sadia Islam",
    "Mizanur Rahman",
    "Rukhsana Alam",
    "Aslam Hossain",
    "Nazia Khatun",
  ], 1),
];

/**
 * The status of each student on a sheet.
 * A key that is missing counts as present.
 */
export type AttendanceMarks = Readonly<Record<string, AttendanceStatus>>;

/** A saved attendance sheet. */
export interface AttendanceSheet {
  /** Stable identifier of the sheet. */
  readonly id: string;
  /** Class the sheet belongs to. */
  readonly classId: string;
  /** Section the sheet belongs to. */
  readonly section: string;
  /** Date of the sheet, ISO (`yyyy-mm-dd`). */
  readonly date: string;
  /** Date shown to the reader, e.g. "03 Nov 2026". */
  readonly dateLabel: string;
  /** Marks for the students on the sheet, keyed by student id. */
  readonly marks: AttendanceMarks;
  /** Time the sheet was last saved, e.g. "09:12 AM". */
  readonly savedAt: string;
  /** Status shown in the history table, e.g. "Saved". */
  readonly status: string;
}

/**
 * The sheet the teacher opens on: Class 9 · A for 04 November 2026.
 *
 * Figma "Attendance Sheet" (2:6985) shows its counters at Present 30,
 * Absent 1, Late 1 and Total 32, so one student is absent and one is late.
 */
export const teacherTodaySheet: AttendanceSheet = {
  id: "sheet-2026-11-04-class-9-a",
  classId: "class-9",
  section: "A",
  date: "2026-11-04",
  dateLabel: "04 Nov 2026",
  savedAt: "09:12 AM",
  status: "Saved",
  marks: buildSheetMarks("class-9", "A", [0, 1]),
};

/**
 * The sheets the teacher has already saved.
 *
 * Figma "Teacher / Attendance history" (2:7419) lists three of them for
 * November 2026, each with its counts and a "Saved" status. The sheet for
 * today is not among them, so it is kept apart in `teacherTodaySheet`.
 */
export const teacherAttendanceSheets: readonly AttendanceSheet[] = [
  {
    id: "sheet-2026-11-03-class-9-a",
    classId: "class-9",
    section: "A",
    date: "2026-11-03",
    dateLabel: "03 Nov 2026",
    savedAt: "09:12 AM",
    status: "Saved",
    marks: buildSheetMarks("class-9", "A", [0]),
  },
  {
    id: "sheet-2026-11-02-class-9-a",
    classId: "class-9",
    section: "A",
    date: "2026-11-02",
    dateLabel: "02 Nov 2026",
    savedAt: "08:58 AM",
    status: "Saved",
    marks: buildSheetMarks("class-9", "A", [0, 1]),
  },
  {
    id: "sheet-2026-11-01-class-9-a",
    classId: "class-9",
    section: "A",
    date: "2026-11-01",
    dateLabel: "01 Nov 2026",
    savedAt: "09:05 AM",
    status: "Saved",
    marks: buildSheetMarks("class-9", "A", []),
  },
];

/**
 * Builds the marks of a saved sheet.
 * The students named in `exceptions` are the ones that are not present: the
 * first index is absent and the rest are late.
 */
function buildSheetMarks(
  classId: string,
  section: string,
  exceptions: readonly number[],
): AttendanceMarks {
  const roll = teacherRolls.find(
    (candidate) =>
      candidate.classId === classId && candidate.section === section,
  );

  const marks: Record<string, AttendanceStatus> = {};

  for (const student of roll?.students ?? []) {
    marks[student.id] = "present";
  }

  for (const index of exceptions) {
    const student = roll?.students[index];
    if (student) marks[student.id] = index === 0 ? "absent" : "late";
  }

  return marks;
}

/** The date the portal treats as today. */
export const teacherToday = "2026-11-04";

/** The date shown on the attendance sheet when it opens. */
export const teacherAttendanceDate = "2026-11-04";

/** The date the sheet starts on, shown in the date filter. */
export const teacherAttendanceDateLabel = "04 Nov 2026";

/**
 * Formats an ISO date the way the date filter shows it, e.g.
 * "04 Nov 2026".
 */
export function formatTeacherDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** The month shown in the history filter. */
export const teacherHistoryMonth = "November 2026";

/** The months offered by the history filter. */
export const teacherHistoryMonths: readonly string[] = [
  "November 2026",
  "October 2026",
  "September 2026",
];

/** The greeting and context line of the dashboard. */
export const teacherGreeting = {
  headline: "Good morning, Nusrat.",
  context: "Science department  /  Wednesday, 04 November 2026",
} as const;

/** The welcome panel of the dashboard. */
export const teacherWelcome = {
  title: "A good day to inspire.",
  body: "3 classes today · 1 attendance sheet awaiting submission",
  actionLabel: "Take attendance",
  actionHref: "/teacher/attendance",
} as const;

/** The metrics of the dashboard. */
export const teacherMetrics: readonly {
  label: string;
  value: string;
}[] = [
  { label: "My classes", value: "3" },
  { label: "Attendance due", value: "1" },
  { label: "Result entries", value: "12" },
  { label: "New notices", value: "3" },
];

/** A row of the dashboard "My classes" table. */
export interface TeacherClassRow {
  /** Class label. */
  readonly className: string;
  /** Subject taught. */
  readonly subject: string;
  /** Lesson time. */
  readonly time: string;
  /** Room the lesson is held in. */
  readonly room: string;
}

/**
 * The rows of the dashboard "My classes" table.
 * Figma "Data table" (2:6484) lists three of them.
 */
export const teacherClassRows: readonly TeacherClassRow[] = [
  { className: "Class 9 · A", subject: "Science", time: "08:00–08:45", room: "Lab 1" },
  { className: "Class 8 · B", subject: "Science", time: "09:30–10:15", room: "204" },
  { className: "Class 10 · A", subject: "Physics", time: "11:30–12:15", room: "Lab 2" },
];

/** The status of a class's attendance for the day. */
export type TeacherAttendanceStatus = "Pending" | "Submitted";

/** A row of the dashboard "Today's attendance" table. */
export interface TeacherAttendanceRow {
  /** Class label. */
  readonly className: string;
  /** Number of students on the roll. */
  readonly students: number;
  /** Whether the sheet has been submitted. */
  readonly status: TeacherAttendanceStatus;
}

/**
 * The rows of the dashboard "Today's attendance" table.
 * Figma "Data table" (2:6507) lists three of them.
 */
export const teacherAttendanceRows: readonly TeacherAttendanceRow[] = [
  { className: "9 · A", students: 32, status: "Pending" },
  { className: "8 · B", students: 30, status: "Submitted" },
  { className: "10 · A", students: 28, status: "Submitted" },
];

/** A row of the dashboard "Recent notices" table. */
export interface TeacherNoticeRow {
  /** Short date, e.g. "04 Nov". */
  readonly date: string;
  /** Notice headline. */
  readonly notice: string;
}

/**
 * The rows of the dashboard "Recent notices" table.
 * Figma "Data table" (2:6526) lists two of them.
 */
export const teacherNoticeRows: readonly TeacherNoticeRow[] = [
  { date: "04 Nov", notice: "Annual examination schedule published" },
  { date: "02 Nov", notice: "Staff meeting · 07 November" },
];

/** Finds a roll by its class and section. */
export function findTeacherRoll(
  classId: string,
  section: string,
): TeacherRoll | undefined {
  return teacherRolls.find(
    (roll) => roll.classId === classId && roll.section === section,
  );
}

/** Finds a class by its identifier. */
export function findTeacherClass(
  classId: string,
): TeacherClass | undefined {
  return teacherClasses.find((candidate) => candidate.id === classId);
}

/** Finds a saved sheet by its class, section and date. */
export function findTeacherSheet(
  classId: string,
  section: string,
  date: string,
): AttendanceSheet | undefined {
  if (
    teacherTodaySheet.classId === classId &&
    teacherTodaySheet.section === section &&
    teacherTodaySheet.date === date
  ) {
    return teacherTodaySheet;
  }

  return teacherAttendanceSheets.find(
    (sheet) =>
      sheet.classId === classId &&
      sheet.section === section &&
      sheet.date === date,
  );
}

/** Counts the marks of a sheet. */
export function countAttendance(marks: AttendanceMarks): {
  present: number;
  absent: number;
  late: number;
  total: number;
} {
  let present = 0;
  let absent = 0;
  let late = 0;

  for (const status of Object.values(marks)) {
    if (status === "absent") absent += 1;
    else if (status === "late") late += 1;
    else present += 1;
  }

  return { present, absent, late, total: present + absent + late };
}
