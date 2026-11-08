/**
 * Home page mock data.
 * Copy, order and spacing mirror the Figma "Public / Home" frames
 * (light 2:166 / 2:176 / 2:186 and their dark counterparts).
 */
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CalendarDays,
  Clock,
  ImageIcon,
  Megaphone,
  Target,
  Users,
} from "lucide-react";

export interface HomeNotice {
  /** Display date, e.g. "04 NOV 2026". */
  date: string;
  /** Category label rendered in the primary colour. */
  category: string;
  /** Notice headline. */
  title: string;
  /** Supporting copy below the headline. */
  description: string;
  /** Route for the "Read notice →" link. */
  href: string;
  /** Tabs the notice appears under. "Notices" always lists every notice. */
  tabs: readonly NoticeCategory[];
}

/** Notice categories used by the "What's Happening" tab row. */
export const noticeCategories = [
  "Notices",
  "Events",
  "Holidays",
  "Achievements",
] as const;

export type NoticeCategory = (typeof noticeCategories)[number];

/** Notices rendered in the "What's Happening" section. */
export const homeNotices: readonly HomeNotice[] = [
  {
    date: "04 NOV 2026",
    category: "ACADEMIC",
    title: "Annual examination schedule published",
    description: "Prepare for the upcoming annual examinations.",
    href: "/notice",
    tabs: ["Notices", "Achievements"],
  },
  {
    date: "02 NOV 2026",
    category: "ADMISSION",
    title: "Admissions for 2027 are now open",
    description: "Start your child’s next chapter with us.",
    href: "/notice",
    tabs: ["Notices"],
  },
  {
    date: "01 NOV 2026",
    category: "EVENT",
    title: "Science fair: ideas that shape tomorrow",
    description: "Join our young innovators on 12 November.",
    href: "/notice",
    tabs: ["Notices", "Events"],
  },
  {
    date: "29 OCT 2026",
    category: "HOLIDAY",
    title: "School closure for public holiday",
    description: "Classes resume on the next working day.",
    href: "/notice",
    tabs: ["Notices", "Holidays"],
  },
];

export interface QuickLink {
  /** Label shown under the icon. */
  label: string;
  /** Route the tile links to. */
  href: string;
  /** Lucide glyph standing in for the Figma icon frame. */
  icon: LucideIcon;
}

/** Quick-access tiles between the "What's Happening" and "Head's message" sections. */
export const quickLinks: readonly QuickLink[] = [
  { label: "Admission", href: "/admission", icon: BookOpen },
  { label: "Routine", href: "/routine", icon: Clock },
  { label: "Teachers", href: "/teachers", icon: Users },
  { label: "Academic Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Gallery", href: "/gallery", icon: ImageIcon },
  { label: "Notice", href: "/notice", icon: Megaphone },
];

export interface SchoolStat {
  /** Headline figure, e.g. "1500+". */
  value: string;
  /** Label beside the figure. */
  label: string;
}

/** "School at a glance" figures shown in the hero. */
export const schoolStats: readonly SchoolStat[] = [
  { value: "1500+", label: "Students" },
  { value: "60+", label: "Teachers" },
  { value: "25+", label: "Years of excellence" },
];

export interface GalleryMoment {
  /** Image path inside /public/images. */
  src: string;
  /** Alternative text for the photograph. */
  alt: string;
  /** Intrinsic image width. */
  width: number;
  /** Intrinsic image height. */
  height: number;
}

/**
 * Campus photographs for the gallery preview.
 * Figma order for the desktop column split is science fair → teacher →
 * sports day → campus (nodes 2:307–2:311).
 */
export const galleryMoments: readonly GalleryMoment[] = [
  {
    src: "/images/science-fair.jpg",
    alt: "Students presenting a project at the science fair",
    width: 1024,
    height: 1024,
  },
  {
    src: "/images/teacher.jpg",
    alt: "A teacher in front of the classroom whiteboard",
    width: 1024,
    height: 1024,
  },
  {
    src: "/images/sports-day.jpg",
    alt: "Students taking part in the annual sports day",
    width: 1024,
    height: 1024,
  },
  {
    src: "/images/campus.jpg",
    alt: "The school campus building on a bright morning",
    width: 1376,
    height: 768,
  },
];

export interface VisionCard {
  /** Heading, e.g. "Our vision". */
  title: string;
  /** Body copy. */
  description: string;
  /** Lucide glyph shown above the heading. */
  icon: LucideIcon;
}

/** Vision and mission cards at the foot of the home page. */
export const visionCards: readonly VisionCard[] = [
  {
    title: "Our vision",
    description:
      "To inspire a generation of curious, capable and compassionate citizens who contribute to a better Bangladesh.",
    icon: Target,
  },
  {
    title: "Our mission",
    description:
      "To provide inclusive, high-quality education through dedicated teaching, strong values and opportunities to explore.",
    icon: BookOpen,
  },
];
