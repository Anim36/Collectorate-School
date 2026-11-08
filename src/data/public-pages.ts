/**
 * Public page mock data.
 * Copy, order and geometry mirror the Figma "Public / Admission",
 * "Public / Teachers & Staff" and "Public / About" frames
 * (light 2:640 / 2:736 / 2:827, 2:916 / 2:1013 / 2:1105,
 * 2:1196 / 2:1293 / 2:1386 and their dark counterparts).
 */

/* -------------------------------------------------------------------------- */
/* Admission                                                                  */
/* -------------------------------------------------------------------------- */

export interface AdmissionStep {
  /** Step number and short label, e.g. "01 / Explore". */
  title: string;
  /** One-line explanation of the step. */
  description: string;
}

/** The four-step admission journey shown as cards. */
export const admissionSteps: readonly AdmissionStep[] = [
  {
    title: "01 / Explore",
    description: "Review our programmes and visit our campus.",
  },
  {
    title: "02 / Apply",
    description: "Download the form and submit your documents.",
  },
  {
    title: "03 / Meet us",
    description: "Join a short assessment and family conversation.",
  },
  {
    title: "04 / Enrol",
    description: "Receive your offer and confirm your place.",
  },
];

export interface AdmissionInfoCard {
  /** Card heading, e.g. "Required documents". */
  title: string;
  /** Bullet lines rendered under the heading. */
  items: readonly string[];
}

/** The "Before you apply" cards. */
export const admissionInfoCards: readonly AdmissionInfoCard[] = [
  {
    title: "Required documents",
    items: [
      "Birth certificate",
      "Previous academic report",
      "2 passport-size photographs",
      "Transfer certificate",
    ],
  },
  {
    title: "Important dates",
    items: [
      "Applications open: 01 November 2026",
      "Deadline: 15 December 2026",
      "Assessment: 20 December 2026",
      "Results: 28 December 2026",
    ],
  },
];

export interface FeeRow {
  /** Name of the fee line, e.g. "Admission fee". */
  fee: string;
  /** Amount for the Classes 6–8 band. */
  classes6to8: string;
  /** Amount for the Classes 9–10 band. */
  classes9to10: string;
}

/** Rows of the "Fees at a glance" table. */
export const admissionFeeRows: readonly FeeRow[] = [
  { fee: "Admission fee", classes6to8: "৳ 5,000", classes9to10: "৳ 6,000" },
  { fee: "Monthly tuition", classes6to8: "৳ 1,500", classes9to10: "৳ 1,800" },
  { fee: "Annual activities", classes6to8: "৳ 1,000", classes9to10: "৳ 1,200" },
];

/** Footnote under the fee table. */
export const admissionFeeNote =
  "Example fees for the 2027 academic year. Contact the school office for the final schedule.";

/* -------------------------------------------------------------------------- */
/* Teachers & Staff                                                           */
/* -------------------------------------------------------------------------- */

/** Tabs of the staff directory. */
export const staffTabs = ["Teachers", "Officers", "Support Staff"] as const;

export type StaffTab = (typeof staffTabs)[number];

/** Groups a staff member can belong to. */
export type StaffGroup = "Teachers" | "Officers" | "Support Staff";

export interface StaffMember {
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
  /** Contact address. */
  email: string;
  /** Photograph path inside /public/images. */
  imageSrc: string;
  /** Alternative text for the portrait. */
  imageAlt: string;
  /** Intrinsic width of the portrait. */
  imageWidth: number;
  /** Intrinsic height of the portrait. */
  imageHeight: number;
}

/**
 * Staff directory.
 * The six "Teachers" entries mirror the Figma "Public / Teachers & Staff"
 * frames exactly (nodes 2:957–2:968); the officers and support staff back
 * the remaining tabs of the filter.
 */
export const staffMembers: readonly StaffMember[] = [
  {
    id: "nusrat-jahan",
    name: "Nusrat Jahan",
    designation: "Senior Teacher · Science",
    subject: "Science",
    group: "Teachers",
    email: "nusrat@school.edu.bd",
    imageSrc: "/images/teacher.jpg",
    imageAlt: "Portrait of Nusrat Jahan, Senior Teacher",
    imageWidth: 1024,
    imageHeight: 1024,
  },
  {
    id: "md-anisur-rahman",
    name: "Md. Anisur Rahman",
    designation: "Head of Institution",
    subject: "Administration",
    group: "Teachers",
    email: "principal@school.edu.bd",
    imageSrc: "/images/head-of-institution.jpg",
    imageAlt: "Portrait of Md. Anisur Rahman, Head of Institution",
    imageWidth: 1024,
    imageHeight: 1024,
  },
  {
    id: "farhana-akter",
    name: "Farhana Akter",
    designation: "Teacher · Mathematics",
    subject: "Mathematics",
    group: "Teachers",
    email: "farhana@school.edu.bd",
    imageSrc: "/images/teacher.jpg",
    imageAlt: "Portrait of Farhana Akter, Teacher of Mathematics",
    imageWidth: 1024,
    imageHeight: 1024,
  },
  {
    id: "shamim-ahmed",
    name: "Shamim Ahmed",
    designation: "Teacher · English",
    subject: "English",
    group: "Teachers",
    email: "shamim@school.edu.bd",
    imageSrc: "/images/head-of-institution.jpg",
    imageAlt: "Portrait of Shamim Ahmed, Teacher of English",
    imageWidth: 1024,
    imageHeight: 1024,
  },
  {
    id: "sadia-islam",
    name: "Sadia Islam",
    designation: "Teacher · Bangla",
    subject: "Bangla",
    group: "Teachers",
    email: "sadia@school.edu.bd",
    imageSrc: "/images/teacher.jpg",
    imageAlt: "Portrait of Sadia Islam, Teacher of Bangla",
    imageWidth: 1024,
    imageHeight: 1024,
  },
  {
    id: "rafiq-hasan",
    name: "Rafiq Hasan",
    designation: "Teacher · ICT",
    subject: "ICT",
    group: "Teachers",
    email: "rafiq@school.edu.bd",
    imageSrc: "/images/head-of-institution.jpg",
    imageAlt: "Portrait of Rafiq Hasan, Teacher of ICT",
    imageWidth: 1024,
    imageHeight: 1024,
  },
  {
    id: "shahnaz-parvin",
    name: "Shahnaz Parvin",
    designation: "Deputy Head of Institution",
    subject: "Administration",
    group: "Officers",
    email: "deputy@school.edu.bd",
    imageSrc: "/images/head-of-institution.jpg",
    imageAlt: "Portrait of Shahnaz Parvin, Deputy Head of Institution",
    imageWidth: 1024,
    imageHeight: 1024,
  },
  {
    id: "habibur-rahman",
    name: "Habibur Rahman",
    designation: "Academic Coordinator",
    subject: "Administration",
    group: "Officers",
    email: "academic@school.edu.bd",
    imageSrc: "/images/teacher.jpg",
    imageAlt: "Portrait of Habibur Rahman, Academic Coordinator",
    imageWidth: 1024,
    imageHeight: 1024,
  },
  {
    id: "shirin-ara-jasmin",
    name: "Shirin Ara Jasmin",
    designation: "Head of Student Welfare",
    subject: "Administration",
    group: "Officers",
    email: "welfare@school.edu.bd",
    imageSrc: "/images/student.jpg",
    imageAlt: "Portrait of Shirin Ara Jasmin, Head of Student Welfare",
    imageWidth: 1024,
    imageHeight: 1024,
  },
  {
    id: "rezaul-karim",
    name: "Rezaul Karim",
    designation: "Office Assistant",
    subject: "Administration",
    group: "Support Staff",
    email: "office@school.edu.bd",
    imageSrc: "/images/teacher.jpg",
    imageAlt: "Portrait of Rezaul Karim, Office Assistant",
    imageWidth: 1024,
    imageHeight: 1024,
  },
  {
    id: "amina-khatun",
    name: "Amina Khatun",
    designation: "Librarian",
    subject: "Administration",
    group: "Support Staff",
    email: "library@school.edu.bd",
    imageSrc: "/images/student.jpg",
    imageAlt: "Portrait of Amina Khatun, Librarian",
    imageWidth: 1024,
    imageHeight: 1024,
  },
  {
    id: "jahangir-alam",
    name: "Jahangir Alam",
    designation: "Lab Technician",
    subject: "Science",
    group: "Support Staff",
    email: "lab@school.edu.bd",
    imageSrc: "/images/teacher.jpg",
    imageAlt: "Portrait of Jahangir Alam, Lab Technician",
    imageWidth: 1024,
    imageHeight: 1024,
  },
  {
    id: "salma-akter",
    name: "Salma Akter",
    designation: "School Nurse",
    subject: "Administration",
    group: "Support Staff",
    email: "nurse@school.edu.bd",
    imageSrc: "/images/student.jpg",
    imageAlt: "Portrait of Salma Akter, School Nurse",
    imageWidth: 1024,
    imageHeight: 1024,
  },
];

/**
 * Subject filter options.
 * "All subjects" resets the filter; the rest map to `StaffMember.subject`.
 */
export const staffSubjects: readonly string[] = [
  "All subjects",
  "Science",
  "Mathematics",
  "English",
  "Bangla",
  "ICT",
  "Administration",
];

/* -------------------------------------------------------------------------- */
/* About                                                                       */
/* -------------------------------------------------------------------------- */

export interface TimelineEntry {
  /** Year and short label, e.g. "1998 / A beginning". */
  title: string;
  /** One-line milestone description. */
  description: string;
}

/** School milestones shown as cards. */
export const aboutTimeline: readonly TimelineEntry[] = [
  {
    title: "1998 / A beginning",
    description: "Our first classrooms welcomed 120 young learners.",
  },
  {
    title: "2010 / Room to grow",
    description: "A new campus, science labs and a larger library.",
  },
  {
    title: "2026 / Looking ahead",
    description: "1,500+ students. 60+ teachers. One shared purpose.",
  },
];

export interface AboutCard {
  /** Card heading. */
  title: string;
  /** Supporting copy. */
  description: string;
}

/** Vision and mission cards. */
export const aboutVisionMission: readonly AboutCard[] = [
  {
    title: "Our vision",
    description:
      "Confident learners and compassionate citizens, built through curiosity and care.",
  },
  {
    title: "Our mission",
    description:
      "Inclusive teaching, strong values and opportunities for every child to explore and grow.",  },
];

/** Campus facilities shown as cards. */
export const aboutFacilities: readonly AboutCard[] = [
  {
    title: "Science laboratories",
    description: "Hands-on learning in physics, chemistry and biology.",
  },
  {
    title: "Library & reading room",
    description: "A quiet space for a world of ideas.",
  },
  {
    title: "ICT laboratory",
    description: "Digital literacy for a connected future.",
  },
  {
    title: "Sports ground",
    description: "Room to play, compete and build teamwork.",
  },
  {
    title: "Creative arts",
    description: "Music, art and cultural celebration.",
  },
  {
    title: "Student wellbeing",
    description: "A safe campus and a caring support team.",
  },
];

/** Introduction paragraph under the first About heading. */
export const aboutIntroduction =
  "For more than 25 years, our school has brought families and children together around one simple idea: every learner deserves the space, support and encouragement to grow. Our teachers and families share one purpose — to learn with confidence and character.";

/** Body copy of the head of institution message. */
export const aboutHeadMessageBody =
  "Learning is a journey we take together, with our families, our teachers and every child we teach.";
