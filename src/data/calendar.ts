/**
 * Academic calendar mock data.
 * Copy, order and geometry mirror the Figma "Public / Academic Calendar"
 * frames (light 2:2379 / 2:2535 / 2:2686 plus the matching dark frames).
 */

/** The kinds of entry shown in the calendar legend. */
export const calendarEventKinds = ["Exam", "Holiday", "School event"] as const;

/** A single kind of calendar entry. */
export type CalendarEventKind = (typeof calendarEventKinds)[number];

export interface CalendarEvent {
  /** Day of the month the event falls on. */
  day: number;
  /** Year the event belongs to. */
  year: number;
  /** Month the event belongs to, 1–12. */
  month: number;
  /** Short label inside the calendar cell. */
  label: string;
  /** Kind of the event, used for the legend colours. */
  kind: CalendarEventKind;
}

/**
 * Events for November 2026.
 * The Figma calendar marks 08 November (PT meeting), 12 November (science
 * fair) and 26 November (holiday).
 */
export const calendarEvents: readonly CalendarEvent[] = [
  {
    day: 4,
    year: 2026,
    month: 11,
    label: "Exam starts",
    kind: "Exam",
  },
  {
    day: 8,
    year: 2026,
    month: 11,
    label: "PT meeting",
    kind: "School event",
  },
  {
    day: 12,
    year: 2026,
    month: 11,
    label: "Science fair",
    kind: "School event",
  },
  {
    day: 22,
    year: 2026,
    month: 11,
    label: "Half-yearly exam",
    kind: "Exam",
  },
  {
    day: 26,
    year: 2026,
    month: 11,
    label: "Holiday",
    kind: "Holiday",
  },
  {
    day: 3,
    year: 2026,
    month: 12,
    label: "Science fair",
    kind: "School event",
  },
  {
    day: 14,
    year: 2026,
    month: 12,
    label: "Exam",
    kind: "Exam",
  },
  {
    day: 25,
    year: 2026,
    month: 12,
    label: "Holiday",
    kind: "Holiday",
  },
  {
    day: 6,
    year: 2027,
    month: 1,
    label: "Exam results",
    kind: "Exam",
  },
  {
    day: 20,
    year: 2027,
    month: 1,
    label: "Annual sports day",
    kind: "School event",
  },
  {
    day: 8,
    year: 2027,
    month: 2,
    label: "Science fair",
    kind: "School event",
  },
  {
    day: 17,
    year: 2027,
    month: 2,
    label: "Holiday",
    kind: "Holiday",
  },
  {
    day: 2,
    year: 2027,
    month: 3,
    label: "Exam",
    kind: "Exam",
  },
  {
    day: 16,
    year: 2027,
    month: 3,
    label: "PT meeting",
    kind: "School event",
  },
  {
    day: 26,
    year: 2027,
    month: 3,
    label: "Holiday",
    kind: "Holiday",
  },
];

/** The month the calendar opens on. */
export const calendarInitialMonth = {
  year: 2026,
  month: 11,
} as const;

export interface CalendarHighlight {
  /** Date line shown in the card heading, e.g. "08 Nov / Families". */
  heading: string;
  /** Supporting line under the heading. */
  detail: string;
  /** Kind of the entry. */
  kind: CalendarEventKind;
}

/**
 * The "Coming up this month" cards.
 * The three entries mirror the Figma "Public / Academic Calendar" cards
 * (nodes 2:2501–2:2509).
 */
export const calendarHighlights: readonly CalendarHighlight[] = [
  {
    heading: "08 Nov / Families",
    detail: "Parent–teacher meeting · 10:00 AM",
    kind: "School event",
  },
  {
    heading: "12 Nov / School event",
    detail: "Annual science fair · School auditorium",
    kind: "School event",
  },
  {
    heading: "26 Nov / Holiday",
    detail: "School closed · Public holiday",
    kind: "Holiday",
  },
];
