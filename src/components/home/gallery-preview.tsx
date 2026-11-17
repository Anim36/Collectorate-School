import Image from "next/image";
import Link from "next/link";

import { SectionHeading } from "@/components/home/section-heading";
import type { PublicGalleryMoment } from "@/types/public";

/**
 * Gallery preview.
 * Figma "Gallery preview" (2:173 desktop, 2:183 tablet, 2:193 mobile): two
 * columns of photographs — a tall image above a short one on the left, the
 * reverse on the right. The columns stack on mobile.
 *
 * The photographs are the newest approved photographs of the public albums,
 * passed in from the server. The section only renders when the school has
 * photographs to show.
 */
export function GalleryPreview({
  moments,
}: {
  moments: readonly PublicGalleryMoment[];
}) {
  // The Figma layout holds four photographs: two per column, the tall one
  // first in the left column and the short one first in the right.
  const [scienceFair, teacher, sportsDay, campus] = moments;

  if (!scienceFair) return null;

  return (
    <section className="flex w-full flex-col items-start gap-6 bg-surface px-6 py-10 md:px-8 md:py-16 xl:px-20">
      <SectionHeading
        eyebrow="LIFE BEYOND THE CLASSROOM"
        title="Small moments. Lasting memories."
      />

      <div className="flex w-full flex-col gap-4 md:flex-row md:gap-4">
        <div className="flex w-full flex-col gap-4 md:w-1/2">
          <div className="relative h-[220px] w-full overflow-hidden rounded-[12px] md:h-[280px]">
            <Image
              src={scienceFair.src}
              alt={scienceFair.alt}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          {teacher ? (
            <div className="relative h-[220px] w-full overflow-hidden rounded-[12px] md:h-[200px]">
              <Image
                src={teacher.src}
                alt={teacher.alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-4 md:w-1/2">
          {sportsDay ? (
            <div className="relative h-[220px] w-full overflow-hidden rounded-[12px] md:h-[200px]">
              <Image
                src={sportsDay.src}
                alt={sportsDay.alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}
          {campus ? (
            <div className="relative h-[220px] w-full overflow-hidden rounded-[12px] md:h-[280px]">
              <Image
                src={campus.src}
                alt={campus.alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}
        </div>
      </div>

      <Link
        href="/gallery"
        className="text-body font-semibold leading-[1.45] text-primary"
      >
        View full gallery →
      </Link>
    </section>
  );
}
