import Image from "next/image";

import { cn } from "@/lib/utils";

export interface GalleryCardProps {
  /** Album cover image inside /public/images. */
  imageSrc: string;
  /** Alternative text for the cover image. */
  imageAlt: string;
  /** Intrinsic width of the cover image. */
  imageWidth: number;
  /** Intrinsic height of the cover image. */
  imageHeight: number;
  /** Album title. */
  title: string;
  /** Supporting line, e.g. "24 photos · 12 Nov 2026". */
  meta: string;
  /**
   * Height of the cover.
   * The public gallery uses a 240px cover; the student portal draws a taller
   * one — 200px on mobile and 280px from tablet up.
   */
  coverHeight?: string;
  className?: string;
}

/**
 * Gallery album card.
 * Figma "Gallery card" (2:17464–2:17463): surface background, 1px border,
 * 12px radius, 24px padding, 240px cover, 24px title and a 13px meta line.
 */
export function GalleryCard({
  imageSrc,
  imageAlt,
  imageWidth,
  imageHeight,
  title,
  meta,
  coverHeight = "h-[240px]",
  className,
}: GalleryCardProps) {
  return (
    <article
      className={cn(
        "flex w-full flex-col items-start gap-4 overflow-hidden rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        width={imageWidth}
        height={imageHeight}
        className={cn(coverHeight, "w-full rounded-[12px] object-cover")}
      />
      <h3 className="text-title font-semibold leading-[1.45] text-ink">
        {title}
      </h3>
      <p className="text-caption leading-[1.45] text-muted">{meta}</p>
    </article>
  );
}
