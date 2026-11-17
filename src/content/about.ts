/**
 * The copy of the about page.
 *
 * The about page is a story of the school, not a table of its rows, so the
 * words live here as static content in one file. Nothing on this page needs
 * the database.
 */

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
      "Inclusive teaching, strong values and opportunities for every child to explore and grow.",
  },
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

/** The vision cards of the home page, the same words the about page carries. */
export const visionCards: readonly AboutCard[] = [
  {
    title: "Our vision",
    description:
      "Confident learners and compassionate citizens, built through curiosity and care.",
  },
  {
    title: "Our mission",
    description:
      "Inclusive teaching, strong values and opportunities for every child to explore and grow.",
  },
];
