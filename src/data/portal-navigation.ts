/**
 * Navigation model for the signed-in portals.
 *
 * The sidebar order and labels mirror the Figma portal frames:
 * "Student / Dashboard" (2:3613), "Teacher / Dashboard" (2:6341) and
 * "Admin / Dashboard" (2:9503).
 *
 * Icons are referenced by name rather than by component so the config can be
 * passed from a server layout into the client components that render it.
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

/** Student portal navigation — Figma "Student sidebar" (2:3614). */
export const studentNav: PortalNavConfig = {
  portalName: "STUDENT PORTAL",
  title: "Student Portal",
  labelSize: "sm",
  iconGap: "sm",
  items: [
    { label: "Dashboard", href: "/student/dashboard", icon: "dashboard" },
    { label: "My Profile", href: "/student/profile", icon: "profile" },
    { label: "Attendance", href: "/student/attendance", icon: "attendance" },
    { label: "Performance", href: "/student/performance", icon: "performance" },
    { label: "Result", href: "/student/result", icon: "result" },
    { label: "Fee Payment", href: "/student/fees", icon: "fees" },
    { label: "Notice", href: "/student/notice", icon: "notice" },
    { label: "Gallery", href: "/student/gallery", icon: "gallery" },
    { label: "Logout", href: "/login", icon: "logout", kind: "logout" },
  ],
  bottomItems: [
    { label: "Home", href: "/student/dashboard", icon: "dashboard" },
    { label: "Attendance", href: "/student/attendance", icon: "attendance" },
    { label: "Result", href: "/student/result", icon: "result" },
    { label: "Fees", href: "/student/fees", icon: "fees" },
    { label: "More", href: "#more", icon: "more" },
  ],
  moreItems: [
    { label: "My Profile", href: "/student/profile", icon: "profile" },
    {
      label: "Performance",
      href: "/student/performance",
      icon: "performance",
    },
    { label: "Notice", href: "/student/notice", icon: "notice" },
    { label: "Gallery", href: "/student/gallery", icon: "gallery" },
    { label: "Logout", href: "/login", icon: "logout", kind: "logout" },
  ],
};

/**
 * Teacher portal navigation — Figma "Teacher sidebar" (2:6342).
 *
 * The bottom tab labels and routes follow the PRD feature names, not the
 * Figma text. Figma's teacher tab bar (2:6602 / 2:6761) names its fourth
 * tab "Fees" and gives the third a "Results" frame, but the features behind
 * them are Notice and Result.
 */
export const teacherNav: PortalNavConfig = {
  portalName: "TEACHER PORTAL",
  title: "Teacher Portal",
  labelSize: "md",
  iconGap: "md",
  items: [
    { label: "Dashboard", href: "/teacher/dashboard", icon: "dashboard" },
    { label: "Attendance", href: "/teacher/attendance", icon: "attendance" },
    { label: "Results", href: "/teacher/results", icon: "result" },
    { label: "Notice", href: "/teacher/notice", icon: "notice" },
    { label: "Gallery", href: "/teacher/gallery", icon: "gallery" },
    { label: "Logout", href: "/login", icon: "logout", kind: "logout" },
  ],
  bottomItems: [
    { label: "Home", href: "/teacher/dashboard", icon: "dashboard" },
    { label: "Attendance", href: "/teacher/attendance", icon: "attendance" },
    { label: "Result", href: "/teacher/results", icon: "result" },
    { label: "Notice", href: "/teacher/notice", icon: "notice" },
    { label: "More", href: "#more", icon: "more" },
  ],
  moreItems: [
    { label: "Gallery", href: "/teacher/gallery", icon: "gallery" },
    { label: "Logout", href: "/login", icon: "logout", kind: "logout" },
  ],
};

/**
 * Admin portal navigation — Figma "Admin sidebar" (2:9504).
 *
 * The bottom tab labels and routes follow the PRD feature names, not the
 * Figma text. Figma's admin tab bar (2:9765 / 2:9918) labels its second,
 * third and fourth tabs "Attendance", "Result" and "Fees", but the frames
 * behind them are Users, Fees and Notices.
 */
export const adminNav: PortalNavConfig = {
  portalName: "ADMIN PANEL",
  title: "Admin Panel",
  labelSize: "md",
  iconGap: "md",
  items: [
    { label: "Dashboard", href: "/admin/dashboard", icon: "dashboard" },
    { label: "Users", href: "/admin/users", icon: "users" },
    { label: "Classes and Subjects", href: "/admin/classes", icon: "classes" },
    { label: "Notices", href: "/admin/notices", icon: "notice" },
    { label: "Gallery", href: "/admin/gallery", icon: "gallery" },
    { label: "Routine", href: "/admin/routine", icon: "clock" },
    { label: "Calendar", href: "/admin/calendar", icon: "calendar" },
    { label: "Fees", href: "/admin/fees", icon: "fees" },
    { label: "Audit Log", href: "/admin/audit-log", icon: "audit" },
    // Figma draws the admin sign-out as a plain text link, with no glyph.
    { label: "Logout", href: "/login", kind: "logout" },
  ],
  bottomItems: [
    { label: "Home", href: "/admin/dashboard", icon: "dashboard" },
    { label: "Users", href: "/admin/users", icon: "users" },
    { label: "Fees", href: "/admin/fees", icon: "fees" },
    { label: "Notices", href: "/admin/notices", icon: "notice" },
    { label: "More", href: "#more", icon: "more" },
  ],
  moreItems: [
    { label: "Classes and Subjects", href: "/admin/classes", icon: "classes" },
    { label: "Gallery", href: "/admin/gallery", icon: "gallery" },
    { label: "Routine", href: "/admin/routine", icon: "clock" },
    { label: "Calendar", href: "/admin/calendar", icon: "calendar" },
    { label: "Audit Log", href: "/admin/audit-log", icon: "audit" },
    { label: "Logout", href: "/login", icon: "logout", kind: "logout" },
  ],
};
