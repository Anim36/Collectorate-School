"use client";

import Link from "next/link";

import { ThemeToggle } from "@/components/shared/theme-toggle";

/**
 * Compact header for the auth screens.
 * Figma "Auth header" (2:3195 / 2:3229 / 2:3263): the school identity and the
 * theme switch both start 32px from the top on desktop and tablet (24px on
 * mobile). The identity sits 32px from the left edge and the theme switch
 * ends 94px from the right edge (34px on mobile); the band is 93px tall on
 * desktop and tablet and 77px on mobile.
 */
export function AuthHeader() {
  return (
    <header className="flex items-start justify-between gap-4 pl-6 pr-[34px] pb-6 pt-6 md:pl-8 md:pr-[94px] md:pb-8 md:pt-8">
      <Link
        href="/"
        className="text-[20px] font-bold leading-[1.45] text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Narail Collectorate School
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle className="size-4 shrink-0 rounded-none p-0" />
        <span className="text-caption leading-[1.45] text-muted">Theme</span>
      </div>
    </header>
  );
}
