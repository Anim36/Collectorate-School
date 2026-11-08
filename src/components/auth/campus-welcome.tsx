import Image from "next/image";

/**
 * Campus image panel beside the auth form.
 * Figma "Campus welcome" (2:3199 desktop, 2:3233 tablet, 2:3267 mobile):
 * a 640x850 crop on desktop, a full-width 305px band on tablet and a 220px
 * band on mobile.
 */
export function CampusWelcome() {
  return (
    <div
      data-auth="campus"
      className="relative isolate h-[220px] w-full overflow-hidden bg-navy md:h-[305px] xl:h-[850px]"
    >
      <Image
        src="/images/campus.jpg"
        alt=""
        fill
        priority
        sizes="(min-width: 1280px) 640px, 100vw"
        className="-z-10 object-cover"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-navy/60" />
    </div>
  );
}
