import type { Metadata } from "next";

import { AdminRoutine } from "@/components/admin/admin-routine";
import {
  getRoutineAction,
  listRoutineClassesAction,
} from "@/app/admin/actions";

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
export default async function AdminRoutinePage() {
  // The classes and the timetable come from the database, so the table shows
  // the routine the school really has.
  const classes = await listRoutineClassesAction();

  const options = classes.ok ? classes.data : [];

  const routine = options[0]
    ? await getRoutineAction(options[0].id)
    : null;

  return (
    <AdminRoutine
      classes={options}
      initialRoutine={routine?.ok ? routine.data : null}
    />
  );
}
