import type { Metadata } from "next";

import { AdminGallery } from "@/components/admin/admin-gallery";

export const metadata: Metadata = {
  title: "Gallery",
  description: "The school albums, and the photos waiting for the admin to approve them.",
};

/**
 * Admin gallery.
 * Figma "Admin / Gallery" (2:12301 desktop, 2:12470 tablet, 2:12600 mobile and
 * the matching dark frames): the album table, the approval queue and the media
 * upload block.
 */
export default function AdminGalleryPage() {
  return <AdminGallery />;
}
