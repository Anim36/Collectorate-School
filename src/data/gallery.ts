/**
 * Gallery mock data.
 * Copy, order and geometry mirror the Figma "Public / Gallery" and
 * "Public / Album detail" frames (light 2:1996 / 2:2071 / 2:2140 and
 * 2:2207 / 2:2269 / 2:2325, plus the matching dark frames).
 */

/** Tabs of the gallery listing. */
export const galleryTabs = ["All albums", "Academic", "Culture", "Sports"] as const;

/** A single gallery tab without the reset entry. */
export type GalleryTab = Exclude<(typeof galleryTabs)[number], "All albums">;

/** Every gallery tab, including the reset entry. */
export type GalleryTabValue = (typeof galleryTabs)[number];

export interface GalleryPhoto {
  /** Photograph path inside /public/images. */
  src: string;
  /** Alternative text for the photograph. */
  alt: string;
  /** Intrinsic width of the photograph. */
  width: number;
  /** Intrinsic height of the photograph. */
  height: number;
}

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
  category: GalleryTab;
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

/**
 * The album grid.
 * The four entries mirror the Figma "Public / Gallery" cards exactly
 * (nodes 2:2029–2:2044); the photographs are reused from the assets already
 * downloaded into /public/images.
 */
export const galleryAlbums: readonly GalleryAlbum[] = [
  {
    id: "science-fair-2026",
    title: "Science fair 2026",
    date: "12 Nov 2026",
    photoCount: 24,
    category: "Academic",
    description: "Innovation, curiosity and bright ideas from every class.",
    photos: [
      {
        src: "/images/science-fair.jpg",
        alt: "Students presenting a project at the science fair",
        width: 1024,
        height: 1024,
      },
      {
        src: "/images/teacher.jpg",
        alt: "A teacher guiding students during the science fair",
        width: 1024,
        height: 1024,
      },
      {
        src: "/images/campus.jpg",
        alt: "The school campus where the science fair is held",
        width: 1376,
        height: 768,
      },
      {
        src: "/images/sports-day.jpg",
        alt: "Students taking part in the annual sports day",
        width: 1024,
        height: 1024,
      },
    ],
  },
  {
    id: "annual-sports-day",
    title: "Annual sports day",
    date: "18 Oct 2026",
    photoCount: 36,
    category: "Sports",
    description: "A day of races, relays and school pride.",
    photos: [
      {
        src: "/images/sports-day.jpg",
        alt: "Students taking part in the annual sports day",
        width: 1024,
        height: 1024,
      },
      {
        src: "/images/student.jpg",
        alt: "A student carrying sports kit on sports day",
        width: 1024,
        height: 1024,
      },
      {
        src: "/images/campus.jpg",
        alt: "The school campus on sports day morning",
        width: 1376,
        height: 768,
      },
    ],
  },
  {
    id: "our-beautiful-campus",
    title: "Our beautiful campus",
    date: "10 Sep 2026",
    photoCount: 18,
    category: "Culture",
    description: "Classrooms, gardens and the spaces we learn in.",
    photos: [
      {
        src: "/images/campus.jpg",
        alt: "The school campus building on a bright morning",
        width: 1376,
        height: 768,
      },
      {
        src: "/images/teacher.jpg",
        alt: "A teacher in front of the classroom whiteboard",
        width: 1024,
        height: 1024,
      },
      {
        src: "/images/student.jpg",
        alt: "A student carrying books in the school corridor",
        width: 1024,
        height: 1024,
      },
    ],
  },
  {
    id: "learning-in-action",
    title: "Learning in action",
    date: "06 Sep 2026",
    photoCount: 20,
    category: "Academic",
    description: "Everyday learning, from the laboratory to the library.",
    photos: [
      {
        src: "/images/teacher.jpg",
        alt: "A teacher in front of the classroom whiteboard",
        width: 1024,
        height: 1024,
      },
      {
        src: "/images/student.jpg",
        alt: "A student carrying books in the school corridor",
        width: 1024,
        height: 1024,
      },
      {
        src: "/images/science-fair.jpg",
        alt: "Students presenting a project at the science fair",
        width: 1024,
        height: 1024,
      },
    ],
  },
];

/** Finds an album by its route identifier. */
export function findGalleryAlbum(albumId: string): GalleryAlbum | undefined {
  return galleryAlbums.find((album) => album.id === albumId);
}

/**
 * The albums shown in the student portal gallery.
 *
 * Figma "Student / Gallery" (light 2:5610 / 2:5671 / 2:5714 and the matching
 * dark frames) lists three albums in a single column — "Science fair 2026",
 * "Annual sports day" and "Our campus" — with the meta line
 * "School memories · 24 photos". The first two albums are the public ones;
 * the campus album carries the portal title Figma uses.
 */
export const studentGalleryAlbums: readonly GalleryAlbum[] = [
  {
    ...galleryAlbums[0],
    title: "Science fair 2026",
    meta: "School memories · 24 photos",
  },
  {
    ...galleryAlbums[1],
    title: "Annual sports day",
    meta: "School memories · 24 photos",
  },
  {
    ...galleryAlbums[2],
    id: "our-campus",
    title: "Our campus",
    meta: "School memories · 24 photos",
  },
];
/** Finds a portal album by its route identifier. */
export function findStudentGalleryAlbum(
  albumId: string,
): GalleryAlbum | undefined {
  return studentGalleryAlbums.find((album) => album.id === albumId);
}
