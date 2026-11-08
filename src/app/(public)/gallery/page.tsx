import type { Metadata } from "next";

import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { PageIntroduction } from "@/components/shared/page-introduction";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Explore the experiences that make our community special.",
};

/**
 * Public gallery page.
 * Figma "Public / Gallery" (light 2:1996 / 2:2071 / 2:2140 and the matching
 * dark frames): a page introduction followed by the filterable album grid.
 */
export default function GalleryPage() {
  return (
    <>
      <PageIntroduction
        eyebrow="HOME  /  GALLERY"
        title="Life at [School Name]."
        description="Explore the experiences that make our community special."
      />

      <section className="flex w-full flex-col items-start px-6 py-6 md:px-8 md:py-8 xl:px-20 xl:py-20">
        <GalleryGrid />
      </section>
    </>
  );
}
