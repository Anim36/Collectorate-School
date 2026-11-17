/**
 * The rolls the seed writes.
 *
 * The teacher portal used to carry the rolls in a mock file under `src/data`.
 * The portal reads the database now, so the names live here with the rest of
 * the seed data: they are the demo students of the school and nothing else
 * reads them.
 *
 * The mock data split every class into the sections A, B and C. The school runs
 * one group per class, so the students of every section are merged into the one
 * section the class has. The roll numbers are renumbered by the seed so they
 * stay unique inside the class.
 */

/** The students of the classes the school has, keyed by the class id. */
export const SEED_DEMO_ROLLS: Readonly<
  Record<string, readonly string[]>
> = {
  // Class 9 — section A, then section B.
  "class-9": [
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
  ],
  // Class 8 — section A, then section B.
  "class-8": [
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
  ],
  // Class 10 — one section.
  "class-10": [
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
  ],
};

/** The names of the classes the rolls belong to. */
const CLASS_NAMES: Readonly<Record<string, string>> = {
  "class-6": "Class 6",
  "class-7": "Class 7",
  "class-8": "Class 8",
  "class-9": "Class 9",
  "class-10": "Class 10",
};

/**
 * The rolls of the classes, ready for the seed to write.
 *
 * Class 6 and Class 7 carry no roll of their own, so a few students are added
 * to them, taken from the roster the admin users table shows.
 */
export function seedDemoRolls(): {
  classId: string;
  className: string;
  names: string[];
}[] {
  const merged = new Map<string, string[]>();

  for (const [classId, names] of Object.entries(SEED_DEMO_ROLLS)) {
    merged.set(classId, [...names]);
  }

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
    className: CLASS_NAMES[classId] ?? classId.replace("class-", "Class "),
    names,
  }));
}
