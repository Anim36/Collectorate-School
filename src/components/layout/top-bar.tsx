import Link from "next/link";

import { utilityLinks } from "@/data/navigation";

/**
 * Utility bar above the navbar.
 * Figma "Utility bar" (2:167 / 2:177 / 2:187): navy fill, 12px vertical
 * padding, 13px medium Inter copy. Desktop and tablet show the location
 * line followed by the four utility links; mobile drops the location line
 * and collapses the portals into a single "Student · Teacher · Login" run.
 */
export function TopBar() {
  return (
    <div className="bg-navy px-6 py-3 text-caption font-medium leading-[17px] text-white md:px-8 md:leading-[19px] xl:px-20">
      <div className="flex items-start gap-4 md:gap-8">
        <p className="hidden whitespace-nowrap md:block">
          Dhaka, Bangladesh&nbsp; • &nbsp;EST. [Year]
        </p>

        {/* Mobile: "Apply Now" plus the collapsed portal run. */}
        <div className="flex w-full items-center justify-between gap-3 md:hidden">
          <Link
            href={utilityLinks[0].href}
            className="whitespace-nowrap transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {utilityLinks[0].label}
          </Link>
          <span className="whitespace-nowrap">
            {utilityLinks.slice(1).map((link, index) => (
              <span key={link.label}>
                {index > 0 ? <span aria-hidden>{" · "}</span> : null}
                <Link
                  href={link.href}
                  className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {link.label.replace(" Portal", "")}
                </Link>
              </span>
            ))}
          </span>
        </div>

        {/* Tablet and desktop: the four utility links. */}
        <ul className="hidden items-start gap-6 md:flex">
          {utilityLinks.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="whitespace-nowrap transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
