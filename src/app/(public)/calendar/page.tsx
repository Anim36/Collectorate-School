import type { Metadata } from "next";

import { AcademicCalendar } from "@/components/calendar/academic-calendar";
import { PageIntroduction } from "@/components/shared/page-introduction";

export const metadata: Metadata = {
  title: "Academic Calendar",
  description:
    "Plan ahead with our academic calendar and upcoming school events.",
};

/**
 * Public academic calendar page.
 * Figma "Public / Academic Calendar" (light 2:2379 / 2:2535 / 2:2686 and the
 * matching dark frames): the page introduction followed by the month grid
 * with its legend and the "Coming up this month" cards.
 */
export default function CalendarPage() {
  return (
    <>
      <PageIntroduction
        eyebrow="HOME  /  ACADEMIC CALENDAR"
        title="Every important date, in one place."
        description="Plan ahead with our academic calendar and upcoming events."
      />

      <section className="flex w-full flex-col items-start px-6 py-6 md:px-8 md:py-8 xl:px-20 xl:py-20">
        <AcademicCalendar />
      </section>
    </>
  );
}
