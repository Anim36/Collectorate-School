/**
 * Weekly routine mock data.
 * Copy, order and geometry mirror the Figma "Public / Routine" frames
 * (light 2:2834 / 2:2961 / 2:3082 plus the matching dark frames).
 */

export interface RoutinePeriod {
  /** Period number, e.g. "P1". */
  period: string;
  /** Start time, e.g. "08:00". */
  time: string;
  /** Subject taught in the period. */
  subject: string;
}

export interface RoutineDay {
  /** Short day name, e.g. "Sun". */
  day: string;
  /** Periods taught on that day, in order. */
  periods: readonly RoutinePeriod[];
}

/** Classes the timetable is available for. */
export const routineClasses = [
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
] as const;

/** A single class without the reset entry. */
export type RoutineClass = (typeof routineClasses)[number];

/** Sections available for each class. */
export const routineSections = ["Section A", "Section B", "Section C"] as const;

/** A single section without the reset entry. */
export type RoutineSection = (typeof routineSections)[number];

/** The default class shown by the filter. */
export const routineDefaultClass: RoutineClass = "Class 9";

/** The default section shown by the filter. */
export const routineDefaultSection: RoutineSection = "Section A";

/** Date the displayed routine takes effect. */
export const routineEffectiveFrom = "01 November 2026";

const PERIOD_TIMES = [
  "08:00",
  "08:45",
  "09:30",
  "10:15",
  "11:30",
  "12:15",
  "13:00",
  "13:45",
] as const;

/**
 * The Class 9 timetable exactly as drawn in the Figma frames
 * (nodes 2:2882–2:2931).
 */
const CLASS_NINE_DAYS: readonly RoutineDay[] = [
  {
    day: "Sun",
    periods: [
      "Bangla",
      "English",
      "Math",
      "Science",
      "ICT",
      "Religion",
      "History",
      "PE",
    ].map((subject, index) => ({
      period: `P${index + 1}`,
      time: PERIOD_TIMES[index],
      subject,
    })),
  },
  {
    day: "Mon",
    periods: [
      "English",
      "Math",
      "Bangla",
      "Science",
      "History",
      "ICT",
      "Religion",
      "Arts",
    ].map((subject, index) => ({
      period: `P${index + 1}`,
      time: PERIOD_TIMES[index],
      subject,
    })),
  },
  {
    day: "Tue",
    periods: [
      "Math",
      "Science",
      "English",
      "Bangla",
      "Religion",
      "History",
      "ICT",
      "PE",
    ].map((subject, index) => ({
      period: `P${index + 1}`,
      time: PERIOD_TIMES[index],
      subject,
    })),
  },
  {
    day: "Wed",
    periods: [
      "Science",
      "Bangla",
      "Math",
      "English",
      "ICT",
      "Religion",
      "Arts",
      "History",
    ].map((subject, index) => ({
      period: `P${index + 1}`,
      time: PERIOD_TIMES[index],
      subject,
    })),
  },
  {
    day: "Thu",
    periods: [
      "Bangla",
      "English",
      "Science",
      "Math",
      "History",
      "ICT",
      "PE",
      "Library",
    ].map((subject, index) => ({
      period: `P${index + 1}`,
      time: PERIOD_TIMES[index],
      subject,
    })),
  },
];

/**
 * The weekly timetable.
 * Class 9 is copied straight from the Figma frames; the remaining classes
 * reuse the same shape with the subject order shifted so every class reads
 * as a distinct timetable.
 */
export const routineTimetable: Record<RoutineClass, readonly RoutineDay[]> = {
  "Class 6": shiftSubjects(CLASS_NINE_DAYS, 2),
  "Class 7": shiftSubjects(CLASS_NINE_DAYS, 5),
  "Class 8": shiftSubjects(CLASS_NINE_DAYS, 7),
  "Class 9": CLASS_NINE_DAYS,
  "Class 10": shiftSubjects(CLASS_NINE_DAYS, 3),
};

/** Rotates the subject of every period by `offset` positions. */
function shiftSubjects(
  days: readonly RoutineDay[],
  offset: number,
): readonly RoutineDay[] {
  const allSubjects = Array.from(
    new Set(days.flatMap((day) => day.periods.map((period) => period.subject))),
  );

  return days.map((day) => ({
    day: day.day,
    periods: day.periods.map((period) => {
      const currentIndex = allSubjects.indexOf(period.subject);
      const nextIndex = (currentIndex + offset) % allSubjects.length;
      return { ...period, subject: allSubjects[nextIndex] };
    }),
  }));
}

/** Footnote under the routine table. */
export const routineNote =
  "Break: 11:00–11:30  •  Friday & Saturday: weekly holidays";
