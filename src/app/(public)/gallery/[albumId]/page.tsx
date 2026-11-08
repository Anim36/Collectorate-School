import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AlbumGrid } from "@/components/gallery/album-grid";
import { PageIntroduction } from "@/components/shared/page-introduction";
import { findGalleryAlbum, galleryAlbums } from "@/data/gallery";

interface AlbumDetailPageProps {
  /** Route parameter carrying the album identifier. */
  params: Promise<{ albumId: string }>;
}

export function generateStaticParams() {
  return galleryAlbums.map((album) => ({ albumId: album.id }));
}

export async function generateMetadata({
  params,
}: AlbumDetailPageProps): Promise<Metadata> {
  const { albumId } = await params;
  const album = findGalleryAlbum(albumId);

  if (!album) {
    return { title: "Album not found" };
  }

  return {
    title: album.title,
    description: album.description,
  };
}

/**
 * Public album detail page.
 * Figma "Public / Album detail" (light 2:2207 / 2:2269 / 2:2325 and the
 * matching dark frames): the page introduction followed by the photograph
 * grid; opening a photograph shows the lightbox viewer.
 */
export default async function AlbumDetailPage({
  params,
}: AlbumDetailPageProps) {
  const { albumId } = await params;
  const album = findGalleryAlbum(albumId);

  if (!album) {
    notFound();
  }

  return (
    <>
      <PageIntroduction
        eyebrow="HOME  /  ALBUM DETAIL"
        title={album.title}
        description={`${album.date}  •  ${album.description}`}
      />

      <section className="flex w-full flex-col items-start px-6 py-6 md:px-8 md:py-8 xl:px-20 xl:py-20">
        <AlbumGrid album={album} />
      </section>
    </>
  );
}
