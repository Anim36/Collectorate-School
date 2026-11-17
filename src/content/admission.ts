/**
 * The static copy of the admission page.
 *
 * The journey, the documents and the dates are what the school says about
 * applying, so they are written here and not kept in the database. The fee
 * table is the one part of the page that reads its rows from the database
 * (`src/server/services/public-fees.ts`).
 */

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

/** Footnote under the fee table. */
export const admissionFeeNote =
  "The fees of every class, for the current academic year. Contact the school office for the final schedule.";
