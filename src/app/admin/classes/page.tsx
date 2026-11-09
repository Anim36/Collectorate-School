import type { Metadata } from "next";

import { AdminClasses } from "@/components/admin/admin-classes";
import {
  listAllocationsAction,
  listClassOptionsAction,
  listClassesAction,
  listSubjectsAction,
  listTeacherOptionsAction,
} from "@/app/admin/actions";

export const metadata: Metadata = {
  title: "Classes and Subjects",
  description: "The classes of the school and the subjects they take.",
};

/**
 * Admin classes and subjects.
 * Figma "Admin / Classes and Subjects" (2:11448 desktop, 2:11634 tablet,
 * 2:11781 mobile and the matching dark frames): the classes table, the
 * subject allocation table and the add and assign dialogs.
 */
export default async function AdminClassesPage() {
  // The classes, the subjects, the allocations and the teachers all come
  // from the database, so the tables and the dropdowns show what is really
  // there.
  const [classes, allocations, subjects, teachers, classOptions] =
    await Promise.all([
      listClassesAction(),
      listAllocationsAction(),
      listSubjectsAction(),
      listTeacherOptionsAction(),
      listClassOptionsAction(),
    ]);

  return (
    <AdminClasses
      initialClasses={classes.ok ? classes.data.rows : []}
      classPageCount={classes.ok ? classes.data.pageCount : 1}
      initialAllocations={allocations.ok ? allocations.data.rows : []}
      allocationPageCount={allocations.ok ? allocations.data.pageCount : 1}
      subjects={subjects.ok ? subjects.data : []}
      teachers={teachers.ok ? teachers.data : []}
      classOptions={classOptions.ok ? classOptions.data : []}
    />
  );
}
