import type { Metadata } from "next";

import { AdminCalendar } from "@/components/admin/admin-calendar";

export const metadata: Metadata = {
  title: "Calendar",
  description: "The school calendar: the exams, the holidays and the events.",
};

/**
 * Admin calendar.
 * Figma "Admin / Calendar" (2:13191 desktop, 2:13380 tablet, 2:13530 mobile
 * and the matching dark frames): the events table, the month grid and the event
 * editor.
 */
export default function AdminCalendarPage() {
  return <AdminCalendar />;
}
