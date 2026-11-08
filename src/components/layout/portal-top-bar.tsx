"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { usePortalSection } from "@/components/layout/portal-section-context";

export interface PortalTopBarProps {
  /** Portal title, e.g. "Student Portal". */
  title: string;
  /** Name of the signed-in user. */
  userName: string;
  /** Photo of the signed-in user. */
  userPhoto: string;
  /** Alternative text for the photo. */
  userPhotoAlt: string;
}

/**
 * Portal top bar.
 * Figma "Student top bar" (2:3654 desktop, 2:3720 tablet, 2:3807 mobile),
 * mirrored by the teacher and admin frames:
 *
 * - Desktop (1440): a 108px band with 32px padding. The title sits at 32px,
 *   the 180px theme group at 816px, then a 40px photo at 1012px and the
 *   user's name at 1068px.
 * - Tablet (768): the same 108px band, with the theme group at 384px and the
 *   photo at 580px.
 * - Mobile (375): an 88px band showing the portal title alone, the moon at
 *   231px, the bell at 271px and the photo at 311px. The user's name is
 *   dropped and the section suffix is hidden.
 */
export function PortalTopBar({
  title,
  userName,
  userPhoto,
  userPhotoAlt,
}: PortalTopBarProps) {
  const pathname = usePathname();
  const section = pathname.split("/")[2];
  const label = section
    ? section.charAt(0).toUpperCase() + section.slice(1)
    : "Dashboard";

  /**
   * A page that splits into tabs names the open one, so the top bar can
   * follow it. Figma draws "Teacher Portal / Attendance Sheet" above the
   * sheet and "Teacher Portal / Attendance history" above the history, so
   * the published name replaces the route's section name.
   */
  const tabLabel = usePortalSection();
  const heading = tabLabel ?? label;

  return (
    <header
      data-portal="top-bar"
      className="flex h-[88px] shrink-0 items-start justify-between gap-4 px-6 py-6 md:h-auto md:min-h-[108px] md:px-8 md:py-8"
    >
      <h1 className="max-w-full shrink-0 text-body font-bold leading-[1.45] text-ink md:max-w-[336px] md:text-body-lg xl:max-w-[768px]">
        {title}
        <span className="hidden md:inline"> / {heading}</span>
      </h1>

      <div className="flex shrink-0 items-start gap-4">
        <div
          data-portal="theme-group"
          className="flex h-11 w-16 items-start justify-between md:w-[180px] md:justify-start md:gap-3"
        >
          <ThemeToggle className="size-6 shrink-0 rounded-none p-0" />

          <span className="hidden w-[44px] pt-[3px] text-[11px] font-medium leading-[1.45] text-muted md:block">
            Theme
          </span>

          <button
            type="button"
            aria-label="Notifications"
            className="flex size-6 shrink-0 items-center justify-center text-ink transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Bell aria-hidden className="size-6" />
          </button>
        </div>

        <Link
          href="#profile"
          className="flex items-start gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src={userPhoto}
            alt={userPhotoAlt}
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-full object-cover"
          />
          <span className="hidden w-[100px] text-caption font-medium leading-[1.45] text-ink md:block">
            {userName}
          </span>
        </Link>
      </div>
    </header>
  );
}
