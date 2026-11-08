import Image from "next/image";
import Link from "next/link";

/**
 * Head of institution message.
 * Figma "Head's message" (2:172 desktop, 2:182 tablet, 2:192 mobile): a
 * 360px square portrait beside the welcome copy on desktop, a 220×360
 * portrait on tablet and a full-width 327×280 portrait on mobile. The quote
 * is 32px from tablet up and 28px on mobile.
 */
export function HeadMessage() {
  return (
    <section className="flex w-full flex-col items-start gap-10 bg-background px-6 py-10 md:flex-row md:px-8 md:py-16 xl:gap-[40px] xl:px-20">
      <div className="relative h-[280px] w-full shrink-0 overflow-hidden rounded-[12px] md:h-[360px] md:w-[220px] xl:w-[360px]">
        <Image
          src="/images/head-of-institution.jpg"
          alt="Portrait of Md. Anisur Rahman, Head of Institution"
          fill
          sizes="(min-width: 1280px) 360px, (min-width: 768px) 220px, 100vw"
          className="object-cover"
        />
      </div>

      <div className="flex w-full flex-col items-start gap-5">
        <p className="text-caption font-bold leading-[1.45] text-primary">
          FROM THE HEAD OF INSTITUTION
        </p>
        <h2 className="text-[28px] font-semibold leading-[1.45] text-ink md:text-heading">
          “Education is not just about results. It’s about who we become.”
        </h2>
        <p className="text-body leading-[1.45] text-muted">
          We nurture confident learners, thoughtful citizens and kind human
          beings. Together with our families and teachers, we make every
          school day a step towards a meaningful future.
        </p>
        <p className="text-body font-semibold leading-[1.45] text-ink">
          Md. Anisur Rahman
        </p>
        <p className="text-caption leading-[1.45] text-muted">
          Head of Institution
        </p>
        <Link
          href="/about"
          className="text-body font-semibold leading-[1.45] text-primary"
        >
          Read full message →
        </Link>
      </div>
    </section>
  );
}
