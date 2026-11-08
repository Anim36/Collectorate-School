/**
 * Teacher gallery mock data.
 *
 * Copy, order and counts mirror the Figma "Teacher / Gallery upload"
 * (light 2:9116 desktop, 2:9270 tablet, 2:9392 mobile) frames and the
 * matching dark frames.
 */

import { galleryAlbums } from "@/data/gallery";

/** The albums a teacher can upload to. */
export const teacherGalleryAlbums = galleryAlbums.map((album) => album.title);

/** The status of an uploaded photo. */
export type TeacherUploadStatus = "Ready" | "Awaiting admin approval";

/** A photo the teacher has staged for upload. */
export interface TeacherUpload {
  /** Stable identifier of the upload. */
  readonly id: string;
  /** File name shown in the uploads table. */
  readonly name: string;
  /** File size shown in the uploads table, e.g. "2.4 MB". */
  readonly size: string;
  /** Where the photo is in the approval flow. */
  readonly status: TeacherUploadStatus;
  /**
   * A preview of the photo.
   * Teacher uploads wait for the admin, so they carry the school asset.
   */
  readonly preview: string;
  /** Alternative text for the preview. */
  readonly previewAlt: string;
}

/**
 * The photos the teacher has already staged.
 *
 * Figma "Data table" (2:9251) lists two of them — "science-fair-01.jpg" and
 * "science-fair-02.jpg" — both 2.4 MB and 1.8 MB and both Ready.
 */
export const teacherUploads: readonly TeacherUpload[] = [
  {
    id: "upload-science-fair-01",
    name: "science-fair-01.jpg",
    size: "2.4 MB",
    status: "Ready",
    preview: "/images/science-fair.jpg",
    previewAlt: "Students presenting a project at the science fair",
  },
  {
    id: "upload-science-fair-02",
    name: "science-fair-02.jpg",
    size: "1.8 MB",
    status: "Ready",
    preview: "/images/campus.jpg",
    previewAlt: "The school campus where the science fair is held",
  },
];

/** The copy above the album selector. */
export const teacherGalleryIntro = "Share a school memory";

/** The copy of the drag-and-drop area. */
export const teacherUploadArea = {
  title: "Drag and drop your photos here",
  body: "or browse from your device · JPG, PNG · Up to 10 MB each",
  actionLabel: "Browse photos",
} as const;

/** The copy of the album preview panel. */
export const teacherAlbumPreview = "Science fair 2026 · 24 photos";
