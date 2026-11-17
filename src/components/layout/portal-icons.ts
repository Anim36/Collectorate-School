import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Ellipsis,
  FileClock,
  FolderTree,
  Gauge,
  Images,
  LogOut,
  Megaphone,
  ScrollText,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { PortalIconName } from "@/types/portal";

/**
 * Icon set for the portal navigation.
 * The Figma sidebars use a 24px outline glyph per entry.
 */
export const portalIcons: Record<PortalIconName, LucideIcon> = {
  attendance: ClipboardCheck,
  audit: FileClock,
  calendar: CalendarDays,
  classes: FolderTree,
  clock: Clock,
  dashboard: Gauge,
  fees: Wallet,
  gallery: Images,
  logout: LogOut,
  more: Ellipsis,
  notice: Megaphone,
  performance: BookOpen,
  profile: UserRound,
  result: ScrollText,
  users: Users,
};
