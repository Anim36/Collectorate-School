"use client";

import Image from "next/image";
import * as React from "react";
import { Maximize2 } from "lucide-react";

import { PhotoLightbox } from "@/components/gallery/photo-lightbox";
import type { GalleryAlbum } from "@/data/gallery";
import { cn } from "@/lib/utils";

export interface AlbumGridProps {
  /** The album whose photographs are shown. */
  album: GalleryAlbum;
  className?: string;
}

/**
 * Album photograph grid.
 * Figma "Album detail main" (2:2233 desktop, 2:2289 tablet, 2:2341 mobile):
 * a two-column grid of 260px photographs on tablet and desktop and a single
 * column on mobile. Every photograph opens the lightbox.
 */
export function AlbumGrid({ album, className }: AlbumGridProps) {
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  return (
    <div className={cn("w-full", className)}>
      <ul className="grid w-full grid-cols-1 gap-8 md:grid-cols-2">
        {album.photos.map((photo, index) => (
          <li key={photo.src} className="w-full">
            <button
              type="button"
              onClick={() => setLightboxIndex(index)}
              aria-label={`Open ${photo.alt} in the photo viewer`}
              className="group relative block h-[260px] w-full overflow-hidden rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 768px) 100vw, 640px"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <span className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-[8px] bg-foreground/70 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Maximize2 aria-hidden className="size-4" />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {lightboxIndex !== null ? (
        <PhotoLightbox
          albumTitle={album.title}
          photos={album.photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </div>
  );
}
