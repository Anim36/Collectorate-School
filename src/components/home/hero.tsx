import Image from "next/image";
import Link from "next/link";

import { EXCELLENCE_LINE, SITE } from "@/config/site";
import type { PublicSchoolStat } from "@/types/public";

/**
 * Home page hero.
 * Figma "Hero" (2:169 desktop, 2:179 tablet, 2:189 mobile): a campus
 * photograph behind a navy scrim with an eyebrow line, a large headline, a
 * 20px sub-line, 16px body copy, two calls to action and the
 * "school at a glance" figures. The headline is 56px from tablet up and
 * 48px on mobile, where the two title lines wrap.
 */
export function Hero({
  schoolStats,
}: {
  schoolStats: readonly PublicSchoolStat[];
}) {
  return (
    <section className="relative isolate flex w-full flex-col items-start gap-6 overflow-hidden px-6 py-10 md:px-8 md:py-20 xl:px-20">
      <Image
        src="/images/campus.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-navy/75" />

      <p className="text-caption font-semibold leading-[1.45] text-white">
        LEARN. LEAD. MAKE A DIFFERENCE.
      </p>

      <h1 className="text-[48px] font-bold leading-[1.45] text-white md:text-[56px]">
        <span className="block">Welcome to</span>
        <span className="block">{SITE.name}</span>
      </h1>

      <p className="text-body-lg leading-[1.45] text-white">
        {EXCELLENCE_LINE}
      </p>

      <p className="max-w-[680px] text-body leading-[1.45] text-white">
        A caring community where curiosity grows, character matters, and every
        student is ready for a brighter tomorrow.
      </p>

      <div className="flex w-full flex-wrap items-start gap-3">
        <Link
          href="/gallery"
          className="inline-flex items-center justify-center rounded-[12px] border border-border bg-surface px-6 py-3 text-body font-semibold leading-[1.45] text-primary transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Explore
        </Link>
        <Link
          href="/admission"
          className="inline-flex items-center justify-center rounded-[12px] bg-action px-6 py-3 text-body font-semibold leading-[1.45] text-white transition-colors hover:bg-action/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Apply Now
        </Link>
      </div>

      <dl className="flex w-full flex-wrap items-start gap-6 text-white md:gap-12">
        {schoolStats.map((stat) => (
          <div key={stat.label} className="flex items-start gap-3">
            <dt className="sr-only">{stat.label}</dt>
            <dd className="text-title font-bold leading-[1.45]">{stat.value}</dd>
            <dd className="text-body leading-[1.45]">{stat.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
