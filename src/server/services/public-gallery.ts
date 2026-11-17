import { unstable_cache } from "next/cache";

import { prisma } from "@/server/db";
import { CACHE_TAGS } from "@/server/cache-tags";
import { MAX_LIST_ROWS } from "@/server/limits";
import type {
  PublicGalleryAlbum,
  PublicGalleryMoment,
} from "@/types/public";

/**
 * The albums an anonymous visitor may see.
 *
 * Only a public album, and only a photograph the admin has approved, is read
 * here: both rules are part of the query, so a photograph that waits for the
 * admin — or one that was rejected — is never served to the public, whatever
 * id or slug a request carries.
 *
 * The read is an explicit allow-list: a title, a date, a caption and the
 * picture itself. No uploader, no review note, no draft state.
 */

/** How long a cached read may serve before it is read again. */
const REVALIDATE_SECONDS = 300;

/** The album select that only picks what the gallery pages show. */
const ALBUM_SELECT = {
  id: true,
  slug: true,
  title: true,
  category: true,
  description: true,
  photoCount: true,
  publishedOn: true,
  photos: {
    where: { status: "APPROVED" as const },
    orderBy: { createdAt: "asc" },
    select: {
      url: true,
      caption: true,
      name: true,
      width: true,
      height: true,
    },
  },
} as const;

/** Maps a row onto the shape the gallery pages show. */
function toAlbum(album: {
  slug: string;
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  photoCount: number;
  publishedOn: Date | null;
  photos: {
    url: string;
    caption: string | null;
    name: string | null;
    width: number | null;
    height: number | null;
  }[];
}): PublicGalleryAlbum {
  return {
    id: album.slug,
    title: album.title,
    date: album.publishedOn
      ? new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(album.publishedOn)
      : "",
    photoCount: album.photoCount,
    category: album.category ?? "Academic",
    description: album.description ?? "",
    photos: album.photos.map((photo) => ({
      src: photo.url,
      alt: photo.caption ?? photo.name ?? album.title,
      width: photo.width ?? 1200,
      height: photo.height ?? 800,
    })),
  };
}

/**
 * The public albums, newest publication first, with their approved
 * photographs.
 */
/** The uncached album-list read, exported for the QA checks. */
export async function loadPublicGalleryAlbums(): Promise<
  PublicGalleryAlbum[]
> {
  const albums = await prisma.galleryAlbum.findMany({
    where: { visibility: "PUBLIC" },
    orderBy: [{ publishedOn: "desc" }, { title: "asc" }],
    take: MAX_LIST_ROWS,
    select: ALBUM_SELECT,
  });

  return albums
    .map(toAlbum)
    .filter((album) => album.photos.length > 0);
}

export async function listPublicGalleryAlbums(): Promise<
  PublicGalleryAlbum[]
> {
  const cached = unstable_cache(
    loadPublicGalleryAlbums,
    ["public-gallery-albums"],
    { tags: [CACHE_TAGS.gallery], revalidate: REVALIDATE_SECONDS },
  );

  return cached();
}

/**
 * One public album, by slug or by id.
 *
 * An album that is not public — or one that holds no approved photograph —
 * is reported the same way as one that does not exist, so an id cannot be
 * probed.
 */
/** The uncached album read, exported for the QA checks. */
export async function loadPublicGalleryAlbum(
  albumId: string,
): Promise<PublicGalleryAlbum | null> {
  const album = await prisma.galleryAlbum.findFirst({
    where: {
      OR: [{ slug: albumId }, { id: albumId }],
      visibility: "PUBLIC",
      photos: { some: { status: "APPROVED" } },
    },
    select: ALBUM_SELECT,
  });

  if (!album) return null;

  return toAlbum(album);
}

export async function getPublicGalleryAlbum(
  albumId: string,
): Promise<PublicGalleryAlbum | null> {
  const cached = unstable_cache(
    loadPublicGalleryAlbum,
    ["public-gallery-album", albumId],
    { tags: [CACHE_TAGS.gallery], revalidate: REVALIDATE_SECONDS },
  );

  return cached(albumId);
}

/**
 * A few approved photographs, for the home gallery preview.
 */
export async function listPublicGalleryMoments(
  limit = 4,
): Promise<PublicGalleryMoment[]> {
  const cached = unstable_cache(
    async (): Promise<PublicGalleryMoment[]> => {
      const photos = await prisma.galleryPhoto.findMany({
        where: { status: "APPROVED", album: { visibility: "PUBLIC" } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          url: true,
          caption: true,
          name: true,
          width: true,
          height: true,
        },
      });

      return photos.map((photo) => ({
        src: photo.url,
        alt: photo.caption ?? photo.name ?? "A photograph of the school",
        width: photo.width ?? 1200,
        height: photo.height ?? 800,
      }));
    },
    ["public-gallery-moments", String(limit)],
    { tags: [CACHE_TAGS.gallery], revalidate: REVALIDATE_SECONDS },
  );

  return cached();
}
