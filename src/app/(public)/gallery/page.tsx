import type { Metadata } from "next";

import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { PageIntroduction } from "@/components/shared/page-introduction";
import { SITE } from "@/config/site";
import { listPublicGalleryAlbums } from "@/server/services/public-gallery";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Gallery",
  description: "Explore the experiences that make our community special.",
  alternates: { canonical: "/gallery" },
};

/**
 * Public gallery page.
 * Figma "Public / Gallery" (light 2:1996 / 2:2071 / 2:2140 and the matching
 * dark frames): a page introduction followed by the filterable album grid.
 *
 * The albums come from the database: a public album, and only the
 * photographs the admin has approved, are passed to the grid.
 */
export default async function GalleryPage() {
  const albums = await listPublicGalleryAlbums();

  return (
    <>
      <PageIntroduction
        eyebrow="HOME  /  GALLERY"
        title={`Life at ${SITE.name}.`}
        description="Explore the experiences that make our community special."
      />

      <section className="flex w-full flex-col items-start px-6 py-6 md:px-8 md:py-8 xl:px-20 xl:py-20">
        {albums.length > 0 ? (
          <GalleryGrid albums={albums} />
        ) : (
          <div className="flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6">
            <h2 className="text-[19px] font-semibold leading-[29px] text-ink">
              No photographs yet
            </h2>
            <p className="mt-4 text-body leading-[1.45] text-muted">
              The albums will appear here once the school publishes them.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
