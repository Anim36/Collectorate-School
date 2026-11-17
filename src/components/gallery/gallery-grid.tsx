"use client";

import Link from "next/link";
import * as React from "react";

import { GalleryCard } from "@/components/shared/gallery-card";
import type { PublicGalleryAlbum } from "@/types/public";
import { cn } from "@/lib/utils";

/**
 * Gallery album grid with tab filter.
 * Figma "Public / Gallery" (light 2:1996 / 2:2071 / 2:2140 and the matching
 * dark frames): a row of tabs followed by a two-column album grid on tablet
 * and desktop, and a single column on mobile.
 *
 * The albums come from the server, filtered to the public albums that hold
 * approved photographs. The tabs are the categories those albums really
 * carry, so the row never offers a tab with nothing behind it.
 */
export function GalleryGrid({
  albums,
}: {
  albums: readonly PublicGalleryAlbum[];
}) {
  const tabs = React.useMemo(() => {
    const categories = [...new Set(albums.map((album) => album.category))];

    return ["All albums", ...categories];
  }, [albums]);

  const [tab, setTab] = React.useState<string>("All albums");

  const visibleAlbums = React.useMemo(
    () =>
      tab === "All albums"
        ? albums
        : albums.filter((album) => album.category === tab),
    [tab, albums],
  );

  return (
    <div className="flex w-full flex-col items-start">
      <div
        role="tablist"
        aria-label="Gallery categories"
        className="flex items-start gap-4 md:gap-8"
      >
        {tabs.map((option) => {
          const isActive = option === tab;
          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(option)}
              className={cn(
                "shrink-0 text-caption font-semibold leading-[1.45] transition-colors md:text-body",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive ? "text-primary" : "text-muted hover:text-primary",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>

      <ul className="mt-8 grid w-full grid-cols-1 gap-8 md:grid-cols-2 md:gap-x-6 md:gap-y-8">
        {visibleAlbums.map((album) => (
          <li key={album.id} className="w-full">
            <Link
              href={`/gallery/${album.id}`}
              className="block w-full rounded-[12px] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <GalleryCard
                imageSrc={album.photos[0].src}
                imageAlt={album.photos[0].alt}
                imageWidth={album.photos[0].width}
                imageHeight={album.photos[0].height}
                title={album.title}
                meta={`${album.photoCount} photos · ${album.date}`}
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
