/**
 * The navigation of the public site.
 *
 * The structure is part of the design, not of the database: the Figma navbar
 * draws these entries in this order, and the footer groups the same routes
 * under its two columns. Only the notice count in the navbar comes from the
 * database.
 *
 * Figma "Navbar / 1440" (2:16037–2:16042) renders the desktop links in this
 * order: Home, Admission →, Teachers & Staff, About, Notice, More →.
 */

export interface NavChildItem {
  /** Label shown in the dropdown. */
  label: string;
  /** Route the item links to. */
  href: string;
}

export interface NavDropdown {
  /** Marks the entry as a dropdown menu. */
  kind: "dropdown";
  /** Trigger label shown in the navbar. */
  label: string;
  /** Items rendered inside the dropdown panel. */
  items: readonly NavChildItem[];
}

export interface NavLink {
  /** Marks the entry as a plain link. */
  kind: "link";
  /** Label shown in the navbar. */
  label: string;
  /** Route the link points at. */
  href: string;
}

export type NavItem = NavLink | NavDropdown;

/** Utility bar links shown above the navbar (Figma "Utility bar" 2:197–2:201). */
export const utilityLinks: readonly NavLink[] = [
  { kind: "link", label: "Apply Now", href: "/admission" },
  { kind: "link", label: "Student Portal", href: "/student" },
  { kind: "link", label: "Teacher Portal", href: "/teacher" },
  { kind: "link", label: "Login", href: "/login" },
];

/** Primary navigation entries, in the order the Figma navbar shows them. */
export const navItems: readonly NavItem[] = [
  { kind: "link", label: "Home", href: "/" },
  {
    kind: "dropdown",
    label: "Admission",
    items: [
      { label: "Admission Info", href: "/admission" },
      { label: "Fees", href: "/admission#fees" },
      { label: "Apply", href: "/admission#apply" },
    ],
  },
  { kind: "link", label: "Teachers & Staff", href: "/teachers" },
  { kind: "link", label: "About", href: "/about" },
  { kind: "link", label: "Notice", href: "/notice" },
  {
    kind: "dropdown",
    label: "More",
    items: [
      { label: "Gallery", href: "/gallery" },
      { label: "Academic Calendar", href: "/calendar" },
      { label: "Routine", href: "/routine" },
    ],
  },
];

/** The footer columns, static from the design frames. */
export const footerExploreLinks: readonly NavChildItem[] = [
  { label: "About our school", href: "/about" },
  { label: "Admission", href: "/admission" },
  { label: "Teachers & Staff", href: "/teachers" },
  { label: "Gallery", href: "/gallery" },
];

export const footerResourceLinks: readonly NavChildItem[] = [
  { label: "Notice board", href: "/notice" },
  { label: "Academic Calendar", href: "/calendar" },
  { label: "Class Routine", href: "/routine" },
  { label: "Student Portal", href: "/student" },
];
