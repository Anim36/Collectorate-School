/**
 * The shapes the gallery pages share with the server.
 *
 * They are kept apart from the mock data in `src/data/gallery.ts`, so a page
 * that reads its albums from the database can hand the same shape to the grid
 * and the lightbox the public gallery uses.
 */

/** A single photograph of an album. */
export interface GalleryPhoto {
  /** Photograph path, either under /public/images or at the file route. */
  src: string;
  /** Alternative text for the photograph. */
  alt: string;
  /** Intrinsic width of the photograph. */
  width: number;
  /** Intrinsic height of the photograph. */
  height: number;
}

/** An album of photographs, as the gallery pages show it. */
export interface GalleryAlbum {
  /** Stable identifier used in the route `/gallery/[albumId]`. */
  id: string;
  /** Album title. */
  title: string;
  /** Publication date, e.g. "12 November 2026". */
  date: string;
  /** Number of photographs in the album. */
  photoCount: number;
  /** Tab the album is filed under. */
  category: string;
  /** Short summary shown under the album title. */
  description: string;
  /**
   * Meta line shown under the album title.
   * The public grid builds it from the photo count and the date; the student
   * portal shows Figma's own "School memories · 24 photos" line instead.
   */
  meta?: string;
  /** Photographs shown in the album grid and the lightbox. */
  photos: readonly GalleryPhoto[];
}
