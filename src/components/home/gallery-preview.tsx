import Image from "next/image";
import Link from "next/link";

import { SectionHeading } from "@/components/home/section-heading";
import { galleryMoments } from "@/data/home";

/**
 * Gallery preview.
 * Figma "Gallery preview" (2:173 desktop, 2:183 tablet, 2:193 mobile): two
 * columns of photographs — a tall image above a short one on the left, the
 * reverse on the right. The columns stack on mobile.
 */
export function GalleryPreview() {
  const [scienceFair, teacher, sportsDay, campus] = galleryMoments;

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
          <div className="relative h-[220px] w-full overflow-hidden rounded-[12px] md:h-[200px]">
            <Image
              src={teacher.src}
              alt={teacher.alt}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 md:w-1/2">
          <div className="relative h-[220px] w-full overflow-hidden rounded-[12px] md:h-[200px]">
            <Image
              src={sportsDay.src}
              alt={sportsDay.alt}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="relative h-[220px] w-full overflow-hidden rounded-[12px] md:h-[280px]">
            <Image
              src={campus.src}
              alt={campus.alt}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>

      <Link
        href="/gallery"
        className="text-body font-semibold leading-[1.45] text-primary"
      >
        Browse All →
      </Link>
    </section>
  );
}
