"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PortalMoreMenu } from "@/components/layout/portal-more-menu";
import { portalIcons } from "@/components/layout/portal-icons";
import { isActivePortalPath } from "@/components/layout/portal-sidebar";
import type { PortalNavItem } from "@/data/portal-navigation";
import { cn } from "@/lib/utils";

export interface PortalBottomNavProps {
  /** Items listed in the tab bar. */
  items: readonly PortalNavItem[];
  /** Entries revealed by the "More" tab. */
  moreItems?: readonly PortalNavItem[];
}

/**
 * Portal bottom tab bar shown below 1280px.
 * Figma "Student bottom navigation" (2:3784 tablet, 2:3866 mobile),
 * "Teacher bottom navigation" (2:6602 / 2:6761) and "Admin bottom
 * navigation" (2:9765 / 2:9918).
 *
 * The bar is 95px tall on tablet (24px padding, 47px tab rows with a 24px
 * icon over a 19px label) and 67px on mobile (12px padding, 43px tab rows
 * with a 24px icon over a 15px label). The five tabs share the width
 * evenly — 137.6px on tablet, 63.8px on mobile — separated by an 8px gap,
 * and carry no divider above the bar.
 *
 * The trailing "More" tab opens an overflow menu rather than navigating.
 */
export function PortalBottomNav({ items, moreItems = [] }: PortalBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      data-portal="bottom-nav"
      aria-label="Portal sections"
      className="flex w-full shrink-0 items-start gap-2 bg-surface px-3 py-3 md:h-[95px] md:px-6 md:py-6"
    >
      {items.map((item) => {
        if (item.icon === "more") {
          return (
            <PortalMoreMenu
              key={item.label}
              items={moreItems}
              label="More portal sections"
            />
          );
        }

        const isActive = isActivePortalPath(pathname, item.href);
        const Icon = item.icon ? portalIcons[item.icon] : null;

        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-start gap-1 overflow-hidden rounded-[8px] px-1 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive ? "text-primary" : "text-muted hover:text-primary",
            )}
          >
            {Icon ? <Icon aria-hidden className="size-6 shrink-0" /> : null}
            <span className="whitespace-nowrap text-[10px] font-medium leading-[1.5] md:text-caption">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
