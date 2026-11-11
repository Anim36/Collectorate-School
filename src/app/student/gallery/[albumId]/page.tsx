import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AlbumGrid } from "@/components/gallery/album-grid";
import { StudentPageHeader } from "@/components/student/student-page-header";
import { Button } from "@/components/ui/button";
import { getStudentGalleryAlbum } from "@/server/services/student-content";

interface StudentAlbumDetailPageProps {
  /** Route parameter carrying the album identifier. */
  params: Promise<{ albumId: string }>;
}

export async function generateMetadata({
  params,
}: StudentAlbumDetailPageProps): Promise<Metadata> {
  const { albumId } = await params;
  const album = await getStudentGalleryAlbum(albumId);

  if (!album) {
    return { title: "Album not found" };
  }

  return {
    title: album.title,
    description: album.description,
  };
}

/**
 * Student album detail page.
 *
 * Figma has no student album detail frame of its own, so the page reuses the
 * public album detail layout (light 2:2207 / 2:2269 / 2:2325): the
 * photograph grid, with the lightbox opening over it. Only the surrounding
 * chrome changes — the portal shell instead of the public navbar and footer.
 *
 * The album is read from the database. An album that is not public — or one
 * that holds no approved photograph — is reported the same way as one that
 * does not exist, so an id cannot be probed.
 */
export default async function StudentAlbumDetailPage({
  params,
}: StudentAlbumDetailPageProps) {
  const { albumId } = await params;
  const album = await getStudentGalleryAlbum(albumId);

  if (!album) {
    notFound();
  }

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <StudentPageHeader
        title={album.title}
        description={`${album.date}  •  ${album.description}`}
      />

      <AlbumGrid album={album} />

      <Button asChild variant="secondary" className="h-[49px] w-[169px] px-0">
        <Link href="/student/gallery">
          <ArrowLeft aria-hidden className="size-4" />
          Back to gallery
        </Link>
      </Button>
    </div>
  );
}
