"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { portalIcons } from "@/components/layout/portal-icons";
import type { PortalNavItem } from "@/data/portal-navigation";
import { cn } from "@/lib/utils";

/** Matches the current route, treating nested routes as active too. */
export function isActivePortalPath(pathname: string, href: string): boolean {
  if (href === "#more") return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface PortalSidebarProps {
  /** Portal name shown under the school identity. */
  portalName: string;
  /** Items listed in the sidebar, in order. */
  items: readonly PortalNavItem[];
  /** Sidebar label size, per role. */
  labelSize: "sm" | "md";
  /** Gap between a row's icon and its label, per role. */
  iconGap: "sm" | "md";
}

/**
 * Portal sidebar shown from 1280px up.
 * Figma "Sidebar navigation" (2:17417) and the role sidebars
 * "Student sidebar" (2:3614), "Teacher sidebar" (2:6342) and
 * "Admin sidebar" (2:9504): a navy 240px column with 24px padding and a
 * 12px gap between every row. The school identity is a 20px bold name, the
 * portal name an 11px label, and each navigation row a 48px block with
 * 12px padding, a 24px icon and a 13px label. The active row uses the
 * action fill.
 */
export function PortalSidebar({
  portalName,
  items,
  labelSize,
  iconGap,
}: PortalSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      data-portal="sidebar"
      className="flex min-h-screen w-[240px] shrink-0 flex-col items-start gap-3 overflow-hidden bg-navy p-6"
    >
      <Link
        href="/"
        className="w-[192px] shrink-0 text-[20px] font-bold leading-[1.45] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        [School Name]
      </Link>

      <p className="w-[192px] shrink-0 text-[11px] font-medium leading-[1.45] text-white">
        {portalName}
      </p>

      {/* "contents" keeps the nav landmark while letting each row join the
          sidebar's 12px gap rhythm. */}
      <nav aria-label="Portal" className="contents">
        {items.map((item) => {
          const isActive = isActivePortalPath(pathname, item.href);
          const Icon = item.icon ? portalIcons[item.icon] : null;

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex w-[192px] shrink-0 items-start overflow-hidden rounded-[8px] p-3 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy",
                iconGap === "sm" ? "gap-3" : "gap-2",
                // Figma draws the admin sign-out as a bare text link.
                !Icon && "h-5 items-center p-0",
                isActive ? "bg-action text-white" : "text-white hover:bg-white/10",
              )}
            >
              {Icon ? <Icon aria-hidden className="size-6 shrink-0" /> : null}
              <span
                className={cn(
                  "w-[120px] shrink-0 font-medium leading-[1.45]",
                  labelSize === "sm" ? "text-caption" : "text-body-md",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
