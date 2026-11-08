import type { Metadata } from "next";

import { TeacherGallery } from "@/components/teacher/teacher-gallery";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Upload photographs to the school gallery albums.",
};

/**
 * Teacher gallery upload.
 * Figma "Teacher / Gallery upload" (2:9116 desktop, 2:9270 tablet, 2:9392
 * mobile and the matching dark frames): the album selector, the drag-and-drop
 * area, the staged uploads table and the album preview.
 */
export default function TeacherGalleryPage() {
  return <TeacherGallery />;
}
