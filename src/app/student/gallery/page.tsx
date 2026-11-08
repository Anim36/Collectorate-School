import type { Metadata } from "next";

import { StudentGallery } from "@/components/student/student-gallery";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Albums from life at the school.",
};

/**
 * Student gallery.
 * Figma "Student / Gallery" (2:5610 desktop, 2:5671 tablet, 2:5714 mobile and
 * the matching dark frames): the album list; each album opens its detail
 * page with the photograph grid and the lightbox.
 */
export default function StudentGalleryPage() {
  return <StudentGallery />;
}
