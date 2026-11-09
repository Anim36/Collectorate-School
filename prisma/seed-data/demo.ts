/**
 * The demo data the seed writes, taken from the mock files in `src/data`.
 *
 * The names, the amounts and the dates are the ones the UI already shows, so
 * the pages look the same once they read from the database. Where the mock
 * data carries sections that the school does not have, the rows are merged
 * into the one section the class has.
 */
import {
  admissionSteps,
  staffMembers,
  type StaffGroup,
} from "@/data/public-pages";
import { galleryAlbums } from "@/data/gallery";
import { quickLinks, schoolStats } from "@/data/home";
import { navItems } from "@/data/navigation";
import { notices } from "@/data/notices";
import { routineTimetable } from "@/data/routine";
import { calendarEvents } from "@/data/calendar";
import { studentProfile } from "@/data/student";
import { teacherClasses, teacherRolls } from "@/data/teacher";
import { adminCalendarRows, adminNotices } from "@/data/admin-11b";
import { adminAuditEvents, adminFeeStructure, adminPayments } from "@/data/admin-11c";

/* ------------------------------------------------------------------ types --- */

/** A demo student. */
export interface DemoStudent {
  readonly id: string;
  readonly studentId: string;
  readonly name: string;
  readonly classId: string;
  readonly className: string;
  /** The roll number inside the class. */
  readonly roll: number;
  readonly email: string;
  readonly guardianName: string;
  readonly guardianPhone: string;
  readonly phone: string;
  readonly emergencyContact: string;
  readonly address: string;
  readonly photoUrl: string;
  readonly dateOfBirth: string;
}

/** A demo teacher. */
export interface DemoTeacher {
  readonly id: string;
  readonly name: string;
  readonly designation: string;
  readonly department: string;
  readonly subject: string;
  readonly email: string;
  readonly phone: string;
  readonly photoUrl: string;
}

/** A demo account that signs in. */
export interface DemoAccount {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: "ADMIN" | "TEACHER" | "STUDENT";
}

/* --------------------------------------------------------------- students --- */

/**
 * The mock rolls of the classes the school has.
 *
 * The mock data splits every class into the sections A, B and C. The school
 * runs one group per class, so the students of every section are merged into
 * the one section the class has. The roll numbers are renumbered so they stay
 * unique inside the class.
 */
function mergedRolls(): { classId: string; className: string; names: string[] }[] {
  const classNames: Record<string, string> = {
    "class-9": "Class 9",
    "class-8": "Class 8",
    "class-10": "Class 10",
  };

  const merged = new Map<string, string[]>();

  for (const roll of teacherRolls) {
    const list = merged.get(roll.classId) ?? [];

    for (const student of roll.students) {
      list.push(student.name);
    }

    merged.set(roll.classId, list);
  }

  // The mock data has no roll for Class 6 or Class 7, so a few students are
  // added to them, taken from the roster the admin users table shows.
  merged.set("class-6", [
    "Arif Hasan",
    "Tanvir Ahmed",
    "Rumana Islam",
    "Sabbir Rahman",
    "Mehedi Hasan",
  ]);

  merged.set("class-7", [
    "Jahangir Alam",
    "Rupa Akter",
    "Tania Sultana",
    "Imran Kabir",
    "Sohel Rana",
  ]);

  return [...merged.entries()].map(([classId, names]) => ({
    classId,
    className: classNames[classId] ?? classId.replace("class-", "Class "),
    names,
  }));
}

/**
 * The demo students, one row per student.
 *
 * The roll number runs from 1 inside the class, so the merged roll of a class
 * has no gaps and no duplicates. The mock data reuses a name in more than
 * one section, so the email address of a repeated name carries a number to
 * keep it unique.
 */
function buildStudents(): DemoStudent[] {
  const students: DemoStudent[] = [];
  const usedEmails = new Set<string>();
  let counter = 42;

  for (const group of mergedRolls()) {
    group.names.forEach((name, index) => {
      counter += 1;

      const isArif = name === studentProfile.name;

      students.push({
        id: `student-${slugId(group.classId)}-${index + 1}`,
        studentId: isArif
          ? studentProfile.studentId
          : `ST-2026-${String(counter).padStart(4, "0")}`,
        name,
        classId: group.classId,
        className: group.className,
        roll: index + 1,
        email: isArif
          ? studentProfile.email
          : uniqueEmail(name, usedEmails),
        guardianName: isArif
          ? studentProfile.guardian
          : `Guardian of ${name}`,
        guardianPhone: isArif
          ? studentProfile.guardianPhone
          : "+880 1700 000000",
        phone: "",
        emergencyContact: isArif ? studentProfile.emergencyContact : "",
        address: isArif ? studentProfile.address : "Narail, Bangladesh",
        photoUrl: "/images/student.jpg",
        dateOfBirth: isArif ? "2011-03-15" : "2011-05-01",
      });
    });
  }

  return students;
}

/**
 * An email address for a name, unique across the seeded students.
 *
 * The first student of a name gets the plain address; a second student of
 * the same name gets a numbered one.
 */
function uniqueEmail(name: string, used: Set<string>): string {
  const base = `${slugId(name)}@example.com`;

  if (!used.has(base)) {
    used.add(base);
    return base;
  }

  let suffix = 2;

  while (used.has(`${slugId(name)}.${suffix}@example.com`)) {
    suffix += 1;
  }

  const address = `${slugId(name)}.${suffix}@example.com`;
  used.add(address);

  return address;
}

/** A slug used to build ids and email addresses. */
function slugId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* --------------------------------------------------------------- teachers --- */

/**
 * The demo teachers.
 *
 * The mock data names the teachers in the staff directory and in the class
 * tables; the accounts that sign in are the teaching staff of the school.
 */
const TEACHER_SEEDS: readonly Omit<DemoTeacher, "id" | "email">[] = [
  {
    name: "Nusrat Jahan",
    designation: "Senior Teacher · Science",
    department: "Science",
    subject: "Science",
    phone: "+880 1712 000001",
    photoUrl: "/images/teacher.jpg",
  },
  {
    name: "Farhana Akter",
    designation: "Teacher · Mathematics",
    department: "Mathematics",
    subject: "Mathematics",
    phone: "+880 1712 000002",
    photoUrl: "/images/teacher.jpg",
  },
  {
    name: "Shamim Ahmed",
    designation: "Teacher · English",
    department: "English",
    subject: "English",
    phone: "+880 1712 000003",
    photoUrl: "/images/head-of-institution.jpg",
  },
  {
    name: "Sadia Islam",
    designation: "Teacher · Bangla",
    department: "Bangla",
    subject: "Bangla",
    phone: "+880 1712 000004",
    photoUrl: "/images/teacher.jpg",
  },
  {
    name: "Rafiq Hasan",
    designation: "Teacher · ICT",
    department: "ICT",
    subject: "ICT",
    phone: "+880 1712 000005",
    photoUrl: "/images/head-of-institution.jpg",
  },
  {
    name: "Md. Anisur Rahman",
    designation: "Head of Institution",
    department: "Administration",
    subject: "Science",
    phone: "+880 1712 000006",
    photoUrl: "/images/head-of-institution.jpg",
  },
];

/** The demo teachers, with their ids and sign-in addresses. */
function buildTeachers(): DemoTeacher[] {
  return TEACHER_SEEDS.map((teacher) => ({
    ...teacher,
    id: `teacher-${slugId(teacher.name)}`,
    email: `${slugId(teacher.name).replace(/-/g, ".")}@school.edu.bd`,
  }));
}

/**
 * The teacher who takes each subject.
 *
 * The class-subject allocation follows the mock staff directory.
 */
const SUBJECT_TEACHERS: Readonly<Record<string, string>> = {
  Science: "Nusrat Jahan",
  Mathematics: "Farhana Akter",
  English: "Shamim Ahmed",
  Bangla: "Sadia Islam",
  ICT: "Rafiq Hasan",
  Physics: "Nusrat Jahan",
  Chemistry: "Nusrat Jahan",
  "Social Science": "Farhana Akter",
  Religion: "Sadia Islam",
  History: "Sadia Islam",
  PE: "Rafiq Hasan",
  Arts: "Farhana Akter",
  Library: "Sadia Islam",
  Play: "Sadia Islam",
  Rhymes: "Sadia Islam",
  Drawing: "Farhana Akter",
  "Basic Numbers": "Farhana Akter",
};

/**
 * The teacher in charge of each class.
 *
 * The mock class table names the class teacher of every class it covers; the
 * classes it does not cover are left to the first teacher of the school.
 */
const CLASS_TEACHERS: Readonly<Record<string, string>> = {
  "class-6": "Farhana Akter",
  "class-7": "Shamim Ahmed",
  "class-8": "Sadia Islam",
  "class-9": "Nusrat Jahan",
  "class-10": "Rafiq Hasan",
};

/* ------------------------------------------------------------------ staff --- */

/** The demo staff directory, from the public "Teachers & Staff" mock data. */
function buildStaff() {
  const groupToType: Record<StaffGroup, "TEACHER" | "OFFICER" | "SUPPORT"> = {
    Teachers: "TEACHER",
    Officers: "OFFICER",
    "Support Staff": "SUPPORT",
  };

  return staffMembers.map((member) => ({
    id: `staff-${member.id}`,
    name: member.name,
    designation: member.designation,
    subject: member.subject,
    department: member.subject === "Administration" ? "Administration" : member.subject,
    staffType: groupToType[member.group],
    email: member.email,
    photoUrl: member.imageSrc,
    photoWidth: member.imageWidth,
    photoHeight: member.imageHeight,
    position: staffMembers.indexOf(member),
  }));
}

/* ------------------------------------------------------------- demo data --- */

/** Everything the seed writes, in one place. */
export const SEED_DEMO_DATA = {
  students: buildStudents(),
  teachers: buildTeachers(),
  staff: buildStaff(),
  subjectTeachers: SUBJECT_TEACHERS,
  classTeachers: CLASS_TEACHERS,
  teacherClasses,
  teacherRolls,
  notices,
  adminNotices,
  adminCalendarRows,
  adminAuditEvents,
  adminPayments,
  adminFeeStructure,
  galleryAlbums,
  quickLinks,
  schoolStats,
  navItems,
  admissionSteps,
  routineTimetable,
  calendarEvents,
} as const;
