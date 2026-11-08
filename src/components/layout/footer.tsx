import Link from "next/link";
import { Facebook, MapPin, Youtube } from "lucide-react";

import type { NavChildItem } from "@/data/navigation";

const exploreLinks: readonly NavChildItem[] = [
  { label: "About our school", href: "/about" },
  { label: "Admission", href: "/admission" },
  { label: "Teachers & Staff", href: "/teachers" },
  { label: "Gallery", href: "/gallery" },
];

const resourceLinks: readonly NavChildItem[] = [
  { label: "Notice board", href: "/notice" },
  { label: "Academic Calendar", href: "/calendar" },
  { label: "Class Routine", href: "/routine" },
  { label: "Student Portal", href: "/student" },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly NavChildItem[];
}) {
  return (
    <div className="flex w-full flex-col items-start gap-3 text-white md:w-[152px] xl:w-[296px]">
      <h3 className="text-body font-semibold leading-[1.45]">{title}</h3>
      <ul className="flex flex-col items-start gap-3 text-caption leading-[1.45]">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-caption leading-[1.45] text-white transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Site footer.
 * Figma "Footer / 1440" (2:16071), "/ 768" (2:16109) and "/ 375" (2:16147):
 * navy fill, 48px vertical padding, four columns on desktop and tablet that
 * stack on mobile, plus the tinted map placeholder and the legal line.
 * The columns group and the legal line are 24px apart (2:16047 / 2:16123).
 */
export function Footer() {
  return (
    <footer className="bg-navy px-6 py-12 text-white md:px-8 xl:px-20">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-8 md:flex-row md:flex-wrap">
          <div className="flex w-full flex-col items-start gap-3 text-white md:w-[152px] xl:w-[296px]">
            <p className="text-title font-bold leading-[1.45]">[School Name]</p>
            <p className="text-body leading-[1.45] text-white">
              Learning today. Leading tomorrow.
            </p>
            <address className="not-italic">
              <p className="text-caption leading-[1.45]">Dhanmondi, Dhaka 1209</p>
              <p className="text-caption leading-[1.45]">+880 2 5500 1200</p>
              <p className="text-caption leading-[1.45]">info@school.edu.bd</p>
            </address>
            <div className="flex h-[19px] items-center gap-4">
              <Link
                href="https://facebook.com"
                aria-label="Facebook"
                className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Facebook aria-hidden className="size-4" />
              </Link>
              <Link
                href="https://youtube.com"
                aria-label="YouTube"
                className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Youtube aria-hidden className="size-4" />
              </Link>
            </div>
          </div>

          <FooterColumn title="Explore" links={exploreLinks} />
          <FooterColumn title="Resources" links={resourceLinks} />

          <div className="flex w-full flex-col items-start gap-3 rounded-[12px] bg-tint p-6 md:w-[152px] xl:w-[296px]">
            <MapPin aria-hidden className="size-6 text-primary" />
            <h3 className="text-body font-semibold leading-[1.45] text-primary">
              Find our campus
            </h3>
            <p className="text-caption leading-[1.45] text-muted">
              Dhanmondi, Dhaka
              <br />
              Map location placeholder
            </p>
          </div>
        </div>

        <p className="text-caption leading-[1.45] text-white">
          © 2026 [School Name]. All rights reserved. • Privacy policy •
          Accessibility
        </p>
      </div>
    </footer>
  );
}
