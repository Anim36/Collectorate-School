import type { Metadata } from "next";

import { PageIntroduction } from "@/components/shared/page-introduction";
import { RoutineTable } from "@/components/routine/routine-table";
import {
  getPublicRoutine,
  listPublicRoutineClasses,
} from "@/server/services/public-routine";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Routine",
  description:
    "Find the weekly timetable for your class, with period times and subjects.",
  alternates: { canonical: "/routine" },
};

/**
 * Public routine page.
 * Figma "Public / Routine" (light 2:2834 / 2:2961 / 2:3082 and the matching
 * dark frames): the page introduction followed by the filterable timetable.
 *
 * The classes come from the database, and the page opens on the published
 * routine of the class the seed teaches — or of the first class that has
 * one. Only a published routine is ever read.
 */
export default async function RoutinePage() {
  const [classes, routines] = await Promise.all([
    listPublicRoutineClasses(),
    loadFirstRoutine(),
  ]);

  return (
    <>
      <PageIntroduction
        eyebrow="HOME  /  ROUTINE"
        title="A rhythm for every school day."
        description="Find the weekly timetable for your class."
      />

      <section className="flex w-full flex-col items-start px-6 py-6 md:px-8 md:py-8 xl:px-20 xl:py-20">
        <RoutineTable classes={classes} routine={routines} />
      </section>
    </>
  );
}

/**
 * The routine the page opens with.
 *
 * Class 9 is the class the design was measured with, so the page opens
 * there when its routine is published; otherwise the first class that has a
 * published routine opens instead.
 */
async function loadFirstRoutine(): Promise<ReturnType<typeof getPublicRoutine>> {
  const preferred = await getPublicRoutine("Class 9");

  if (preferred) return preferred;

  for (const entry of await listPublicRoutineClasses()) {
    const routine = await getPublicRoutine(entry.id);

    if (routine) return routine;
  }

  return null;
}
