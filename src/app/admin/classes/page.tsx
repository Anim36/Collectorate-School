import type { Metadata } from "next";

import { AdminClasses } from "@/components/admin/admin-classes";

export const metadata: Metadata = {
  title: "Classes and Subjects",
  description: "The classes of the school, their sections and the subjects they take.",
};

/**
 * Admin classes and subjects.
 * Figma "Admin / Classes and Subjects" (2:11448 desktop, 2:11634 tablet,
 * 2:11781 mobile and the matching dark frames): the classes table, the
 * subject allocation table and the add and assign dialogs.
 */
export default function AdminClassesPage() {
  return <AdminClasses />;
}
