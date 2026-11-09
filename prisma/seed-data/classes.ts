/**
 * The school structure the seed writes.
 *
 * The school runs from Nursery to Class 10 and every class is a single group:
 * there are no A/B/C sections, no boy/girl split and no shifts. Each class
 * therefore carries exactly one section, named "Default".
 */

/** A class of the school. */
export interface SeedClass {
  /** The id of the class row, e.g. "class-9". */
  readonly id: string;
  /** The name shown everywhere, e.g. "Class 9". */
  readonly name: string;
  /** The position in the school, 0 for Nursery through 11 for Class 10. */
  readonly sortOrder: number;
  /** Whether the class reports a grade point or a letter grade only. */
  readonly gradingMode: "GPA" | "GRADE_ONLY";
  /** The subjects taught in the class. */
  readonly subjects: readonly string[];
  /** The monthly tuition in taka. */
  readonly monthlyTuition: number;
  /** The admission fee in taka. */
  readonly admissionFee: number;
  /** The activities fee in taka. */
  readonly activities: number;
}

/** The name every seeded section carries. */
export const DEFAULT_SECTION_NAME = "Default";

/**
 * The twelve classes, in school order.
 *
 * Nursery and KG are graded on a letter grade only, so no grade point is
 * computed for them; every other class reports a grade point.
 */
export const SEED_CLASSES: readonly SeedClass[] = [
  {
    id: "class-nursery",
    name: "Nursery",
    sortOrder: 0,
    gradingMode: "GRADE_ONLY",
    subjects: ["Play", "Rhymes", "Drawing", "Basic Numbers"],
    monthlyTuition: 800,
    admissionFee: 3000,
    activities: 500,
  },
  {
    id: "class-kg",
    name: "KG",
    sortOrder: 1,
    gradingMode: "GRADE_ONLY",
    subjects: ["Play", "Rhymes", "Drawing", "Basic Numbers", "English"],
    monthlyTuition: 900,
    admissionFee: 3500,
    activities: 500,
  },
  {
    id: "class-1",
    name: "Class 1",
    sortOrder: 2,
    gradingMode: "GPA",
    subjects: ["Bangla", "English", "Mathematics", "Drawing", "Rhymes"],
    monthlyTuition: 1000,
    admissionFee: 4000,
    activities: 700,
  },
  {
    id: "class-2",
    name: "Class 2",
    sortOrder: 3,
    gradingMode: "GPA",
    subjects: ["Bangla", "English", "Mathematics", "Science", "Drawing"],
    monthlyTuition: 1000,
    admissionFee: 4000,
    activities: 700,
  },
  {
    id: "class-3",
    name: "Class 3",
    sortOrder: 4,
    gradingMode: "GPA",
    subjects: ["Bangla", "English", "Mathematics", "Science", "ICT"],
    monthlyTuition: 1100,
    admissionFee: 4000,
    activities: 800,
  },
  {
    id: "class-4",
    name: "Class 4",
    sortOrder: 5,
    gradingMode: "GPA",
    subjects: ["Bangla", "English", "Mathematics", "Science", "ICT", "Religion"],
    monthlyTuition: 1100,
    admissionFee: 4500,
    activities: 800,
  },
  {
    id: "class-5",
    name: "Class 5",
    sortOrder: 6,
    gradingMode: "GPA",
    subjects: [
      "Bangla",
      "English",
      "Mathematics",
      "Science",
      "ICT",
      "Religion",
      "History",
    ],
    monthlyTuition: 1200,
    admissionFee: 4500,
    activities: 900,
  },
  {
    id: "class-6",
    name: "Class 6",
    sortOrder: 7,
    gradingMode: "GPA",
    subjects: [
      "Bangla",
      "English",
      "Mathematics",
      "Science",
      "ICT",
      "Religion",
      "History",
      "Social Science",
      "Physical Education",
      "Arts",
      "Library",
    ],
    monthlyTuition: 1500,
    admissionFee: 5000,
    activities: 1000,
  },
  {
    id: "class-7",
    name: "Class 7",
    sortOrder: 8,
    gradingMode: "GPA",
    subjects: [
      "Bangla",
      "English",
      "Mathematics",
      "Science",
      "ICT",
      "Religion",
      "History",
      "Social Science",
      "Physical Education",
      "Arts",
      "Library",
    ],
    monthlyTuition: 1500,
    admissionFee: 5000,
    activities: 1000,
  },
  {
    id: "class-8",
    name: "Class 8",
    sortOrder: 9,
    gradingMode: "GPA",
    subjects: [
      "Bangla",
      "English",
      "Mathematics",
      "Science",
      "ICT",
      "Religion",
      "History",
      "Social Science",
      "Physical Education",
      "Arts",
      "Library",
    ],
    monthlyTuition: 1500,
    admissionFee: 5000,
    activities: 1000,
  },
  {
    id: "class-9",
    name: "Class 9",
    sortOrder: 10,
    gradingMode: "GPA",
    subjects: [
      "Bangla",
      "English",
      "Mathematics",
      "Science",
      "Physics",
      "Chemistry",
      "ICT",
      "Religion",
      "History",
      "Social Science",
      "Physical Education",
      "Arts",
      "Library",
    ],
    monthlyTuition: 1800,
    admissionFee: 6000,
    activities: 1200,
  },
  {
    id: "class-10",
    name: "Class 10",
    sortOrder: 11,
    gradingMode: "GPA",
    subjects: [
      "Bangla",
      "English",
      "Mathematics",
      "Science",
      "Physics",
      "Chemistry",
      "ICT",
      "Religion",
      "History",
      "Social Science",
      "Physical Education",
      "Arts",
      "Library",
    ],
    monthlyTuition: 1800,
    admissionFee: 6000,
    activities: 1200,
  },
];

/**
 * The students of the classes the mock data does not cover.
 *
 * The mock data only goes as far as Class 6, so Nursery to Class 5 get a
 * handful of clearly fictional students each.
 */
export const SEED_FAKE_STUDENT_NAMES: Readonly<
  Record<string, readonly string[]>
> = {
  "class-nursery": [
    "Aarav Demo",
    "Bri Demo",
    "Chaya Demo",
  ],
  "class-kg": [
    "Doyel Demo",
    "Eshan Demo",
    "Farha Demo",
    "Gia Demo",
  ],
  "class-1": [
    "Hiba Demo",
    "Israk Demo",
    "Jamil Demo",
    "Keya Demo",
  ],
  "class-2": [
    "Layan Demo",
    "Mahi Demo",
    "Noya Demo",
  ],
  "class-3": [
    "Oishi Demo",
    "Pial Demo",
    "Rafi Demo",
    "Sabreen Demo",
  ],
  "class-4": [
    "Tania Demo",
    "Urmi Demo",
    "Vivek Demo",
  ],
  "class-5": [
    "Wafa Demo",
    "Xeon Demo",
    "Yara Demo",
    "Zayan Demo",
  ],
};
