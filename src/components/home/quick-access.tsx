import Link from "next/link";

import { SectionHeading } from "@/components/home/section-heading";
import { quickLinks } from "@/data/home";

/**
 * Quick access tiles.
 * Figma "Quick access" (2:171 desktop, 2:181 tablet, 2:191 mobile): a
 * surface background with tinted 12px-radius tiles, each holding a 24px
 * icon and a 16px semibold label. Six tiles across on desktop, three on
 * tablet and two on mobile.
 */
export function QuickAccess() {
  return (
    <section className="flex w-full flex-col items-start gap-6 bg-surface px-6 py-10 md:px-8 md:py-16 xl:px-20">
      <SectionHeading
        eyebrow="YOUR CAMPUS, CONNECTED"
        title="Everything you need, one place"
      />

      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 xl:grid-cols-6">
        {quickLinks.map((link) => {
          const Icon = link.icon;

          return (
            <li key={link.label} className="w-full">
              <Link
                href={link.href}
                className="flex h-full w-full flex-col items-start gap-4 rounded-[12px] bg-tint p-4 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon aria-hidden className="size-6 text-primary" />
                <span className="text-body font-semibold leading-[1.45] text-primary">
                  {link.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
