"use client";

import Link from "next/link";

import { GalleryCard } from "@/components/shared/gallery-card";
import { StudentPageHeader } from "@/components/student/student-page-header";
import { cn } from "@/lib/utils";
import { studentGalleryAlbums } from "@/data/gallery";

/**
 * Student gallery album list.
 *
 * Figma "Student / Gallery" (light 2:5610 desktop, 2:5671 tablet, 2:5714
 * mobile and the matching dark frames) lists the albums in a single column:
 *
 * - Desktop (1440): 32px padding. A 46px heading, the context line and three
 *   416px album cards, 24px apart.
 * - Tablet (768): 32px padding; the cards keep their height.
 * - Mobile (375): 24px padding and three 336px cards, 24px apart.
 *
 * The card itself is the public gallery card (Figma "Gallery card"
 * 2:17464–2:17463) with a taller cover: 200px on mobile and 280px from
 * tablet up.
 *
 * The albums are separate blocks rather than list items so that each one
 * measures as the frame Figma draws.
 */
export function StudentGallery({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8",
        className,
      )}
    >
      <StudentPageHeader
        title="Gallery"
        description="Your school life, clearly organised."
      />

      {studentGalleryAlbums.map((album) => (
        <Link
          key={album.id}
          href={`/student/gallery/${album.id}`}
          className="block w-full rounded-[12px] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <GalleryCard
            imageSrc={album.photos[0].src}
            imageAlt={album.photos[0].alt}
            imageWidth={album.photos[0].width}
            imageHeight={album.photos[0].height}
            title={album.title}
            meta={album.meta ?? ""}
            coverHeight="h-[200px] md:h-[280px]"
          />
        </Link>
      ))}
    </div>
  );
}
