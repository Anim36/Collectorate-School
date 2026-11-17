/**
 * The shapes of the signed-in portal navigation.
 *
 * They are kept apart from the config in `src/data/portal-navigation.ts`, so
 * the portal components can carry the types without pulling the mock data —
 * or whatever replaces it — into a client bundle.
 */

export type PortalIconName =
  | "attendance"
  | "audit"
  | "calendar"
  | "classes"
  | "clock"
  | "dashboard"
  | "fees"
  | "gallery"
  | "logout"
  | "more"
  | "notice"
  | "performance"
  | "profile"
  | "result"
  | "users";

export interface PortalNavItem {
  /** Label shown in the sidebar and, where used, the bottom tab bar. */
  label: string;
  /** Route the item links to. */
  href: string;
  /** Icon rendered before the label. Omitted when Figma shows no glyph. */
  icon?: PortalIconName;
  /** Marks the sign-out entry, which links to /login instead of a section. */
  kind?: "logout";
}

export interface PortalNavConfig {
  /** Portal name shown under the school identity in the sidebar. */
  portalName: string;
  /** Title in the top bar, e.g. "Student Portal". */
  title: string;
  /**
   * Sidebar label size. Figma uses a 13px label in the student sidebar and
   * a 14px label in the teacher and admin sidebars.
   */
  labelSize: "sm" | "md";
  /**
   * Gap between a row's icon and its label. The student sidebar uses 12px;
   * the teacher and admin sidebars use 8px.
   */
  iconGap: "sm" | "md";
  /** Items listed in the desktop sidebar, in order. */
  items: readonly PortalNavItem[];
  /**
   * Items listed in the tablet and mobile bottom tab bar. Figma shows five
   * entries per role with a trailing "More" tab.
   */
  bottomItems: readonly PortalNavItem[];
  /**
   * Entries revealed by the "More" tab, in order.
   */
  moreItems: readonly PortalNavItem[];
}
