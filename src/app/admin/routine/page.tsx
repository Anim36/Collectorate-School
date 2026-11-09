import type { Metadata } from "next";

import { AdminRoutine } from "@/components/admin/admin-routine";

export const metadata: Metadata = {
  title: "Routine",
  description: "The weekly timetable of a class, period by period.",
};

/**
 * Admin routine.
 * Figma "Admin / Routine" (2:12718 desktop, 2:12906 tablet, 2:13055 mobile and
 * the matching dark frames): the class filter, the editable timetable and the
 * routine actions.
 */
export default function AdminRoutinePage() {
  return <AdminRoutine />;
}
