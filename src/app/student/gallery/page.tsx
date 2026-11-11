import type { Metadata } from "next";

import { StudentGallery } from "@/components/student/student-gallery";
import { listStudentGalleryAlbums } from "@/server/services/student-content";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Albums from life at the school.",
};

/**
 * Student gallery.
 * Figma "Student / Gallery" (2:5610 desktop, 2:5671 tablet, 2:5714 mobile and
 * the matching dark frames): the album list; each album opens its detail
 * page with the photograph grid and the lightbox.
 *
 * The albums are read from the database. Only a public album that holds an
 * approved photograph is listed, so a photograph the admin has not approved
 * never reaches the portal.
 */
export default async function StudentGalleryPage() {
  const albums = await listStudentGalleryAlbums();

  return <StudentGallery albums={albums} />;
}
