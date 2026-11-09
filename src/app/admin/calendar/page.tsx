import type { Metadata } from "next";

import { AdminCalendar } from "@/components/admin/admin-calendar";
import { listCalendarEventsAction } from "@/app/admin/actions";

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
export default async function AdminCalendarPage() {
  // The events come from the database, so the table shows the school calendar
  // and not the mock rows.
  const events = await listCalendarEventsAction({ page: 0, pageSize: 20 });

  return (
    <AdminCalendar
      initialEvents={events.ok ? events.data : null}
      months={MONTHS}
    />
  );
}

/** The months the calendar filter offers, in calendar order. */
const MONTHS = [
  "November 2026",
  "December 2026",
  "January 2027",
  "February 2027",
  "March 2027",
  "April 2027",
  "May 2027",
  "June 2027",
  "July 2027",
  "August 2027",
  "September 2027",
  "October 2027",
];
