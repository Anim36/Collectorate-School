"use client";

import Image from "next/image";
import * as React from "react";
import { X } from "lucide-react";

import { useFocusTrap } from "@/hooks/use-focus-trap";
import type { GalleryPhoto } from "@/types/gallery";

export interface PhotoLightboxProps {
  /** The album the photographs belong to. */
  albumTitle: string;
  /** Photographs available in the lightbox. */
  photos: readonly GalleryPhoto[];
  /** Index of the photograph shown when the lightbox opens. */
  initialIndex: number;
  /** Fired when the lightbox should close. */
  onClose: () => void;
}

/**
 * Lightbox viewer.
 * Figma "Lightbox viewer — open state" (2:2240 desktop, 2:2296 tablet,
 * 2:2350 mobile): a full-page backdrop with a panel holding the album title
 * and a close affordance on the leading edge, the photograph itself, and a
 * footer row with previous, next and the counter.
 */
export function PhotoLightbox({
  albumTitle,
  photos,
  initialIndex,
  onClose,
}: PhotoLightboxProps) {
  const [index, setIndex] = React.useState(initialIndex);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const goTo = React.useCallback(
    (nextIndex: number) => {
      setIndex((nextIndex + photos.length) % photos.length);
    },
    [photos.length],
  );

  // The focus stays inside the viewer and Escape closes it.
  useFocusTrap(true, onClose, panelRef);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") goTo(index - 1);
      if (event.key === "ArrowRight") goTo(index + 1);
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [goTo, index]);

  const photo = photos[index];

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${albumTitle} photo viewer`}
      className="fixed inset-0 z-50 overflow-y-auto bg-foreground/80 px-6 py-[200px] backdrop-blur-sm"
    >
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-4 rounded-[12px] bg-surface p-6 shadow-overlay">
        <div className="flex w-full items-start justify-between gap-4">
          <h2 className="text-body-lg font-semibold leading-[1.45] text-ink">
            {albumTitle}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close photo viewer"
            className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-border bg-surface text-ink transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        <div className="relative h-[220px] w-full overflow-hidden rounded-[12px] md:h-[420px]">
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(max-width: 768px) 100vw, 1280px"
            className="object-cover"
          />
        </div>

        <div className="flex w-full items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            className="text-body-md font-medium leading-[1.45] text-ink transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ‹ Previous
          </button>

          <p className="text-body-md leading-[1.45] text-muted">
            {index + 1} / {photos.length}
          </p>

          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="text-body-md font-medium leading-[1.45] text-ink transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Next ›
          </button>
        </div>
      </div>
    </div>
  );
}
