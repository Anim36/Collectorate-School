import type { Metadata } from "next";

import { PageIntroduction } from "@/components/shared/page-introduction";
import { RoutineTable } from "@/components/routine/routine-table";

export const metadata: Metadata = {
  title: "Routine",
  description:
    "Find the weekly timetable for your class and section, with period times and subjects.",
};

/**
 * Public routine page.
 * Figma "Public / Routine" (light 2:2834 / 2:2961 / 2:3082 and the matching
 * dark frames): the page introduction followed by the filterable timetable.
 */
export default function RoutinePage() {
  return (
    <>
      <PageIntroduction
        eyebrow="HOME  /  ROUTINE"
        title="A rhythm for every school day."
        description="Find the weekly timetable for your class and section."
      />

      <section className="flex w-full flex-col items-start px-6 py-6 md:px-8 md:py-8 xl:px-20 xl:py-20">
        <RoutineTable />
      </section>
    </>
  );
}
