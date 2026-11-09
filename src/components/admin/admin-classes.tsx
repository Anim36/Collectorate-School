"use client";

import * as React from "react";

import { ClassModal, SubjectModal } from "@/components/admin/class-modals";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTableFooter } from "@/components/admin/admin-table-footer";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { PortalTable } from "@/components/shared/portal-table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  assignSubjectAction,
  saveClassAction,
} from "@/app/admin/actions";
import { adminGreeting } from "@/data/admin";

export interface AdminClassesProps {
  /** The classes the server read. */
  initialClasses: readonly {
    id: string;
    name: string;
    sortOrder: number;
    gradingMode: "GPA" | "GRADE_ONLY";
    students: number;
    classTeacher: string;
    subjectCount: number;
  }[];
  /** How many pages of classes there are. */
  classPageCount: number;
  /** The subject allocations the server read. */
  initialAllocations: readonly {
    id: string;
    subject: string;
    teacher: string;
    className: string;
  }[];
  /** How many pages of allocations there are. */
  allocationPageCount: number;
  /** The subjects of the school. */
  subjects: readonly { id: string; name: string }[];
  /** The teachers that can be picked. */
  teachers: readonly { id: string; name: string }[];
  /** The classes, for the dropdowns. */
  classOptions: readonly { id: string; name: string }[];
}

/**
 * The page sizes the tables show.
 *
 * Figma draws five classes and three allocations on a page, so a page holds
 * that many rows.
 */
const CLASS_PAGE_SIZE = 5;
const ALLOCATION_PAGE_SIZE = 3;

/**
 * The admin classes page.
 *
 * Figma "Admin / Classes and Subjects" (2:11494 desktop, 2:11641 tablet,
 * 2:11786 mobile):
 *
 * - Desktop (1440): 32px padding. A 93px heading, the 47px "Add class"
 *   action, the 428px classes table, the 35px "Subject allocation" heading,
 *   the 308px allocation table and the 49px "Assign subject" action.
 * - Tablet (768): the same rhythm.
 * - Mobile (375): 24px padding, a 111px heading, the 47px action, the 669px
 *   classes table, the 35px heading, the 345px allocation table and the 49px
 *   action.
 *
 * The classes, the counts and the allocations all come from the database.
 */
export function AdminClasses({
  initialClasses,
  classPageCount,
  initialAllocations,
  allocationPageCount,
  subjects,
  teachers,
  classOptions,
}: AdminClassesProps) {
  const { toast } = useToast();

  // The top bar names the section, as Figma draws it: "Admin Panel / Classes
  // and Subjects", which wraps onto two lines on the tablet bar.
  useSetPortalSection("Classes and Subjects");

  const [classes, setClasses] = React.useState(initialClasses);
  const [allocations, setAllocations] = React.useState(initialAllocations);
  const [classPage, setClassPage] = React.useState(0);
  const [allocationPage, setAllocationPage] = React.useState(0);
  const [classModalOpen, setClassModalOpen] = React.useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = React.useState(false);

  const classColumns = [
    { header: "Class", cell: (row: (typeof classes)[number]) => row.name },
    {
      header: "Students",
      cell: (row: (typeof classes)[number]) => String(row.students),
    },
    {
      header: "Class teacher",
      cell: (row: (typeof classes)[number]) => row.classTeacher,
    },
    {
      header: "Subjects",
      cell: (row: (typeof classes)[number]) => String(row.subjectCount),
    },
  ];

  const classRecords = classes.map((row) => ({
    id: row.id,
    lines: [
      { label: "Class", value: row.name },
      { label: "Students", value: String(row.students) },
      { label: "Class teacher", value: row.classTeacher },
      { label: "Subjects", value: String(row.subjectCount) },
    ],
  }));

  const allocationColumns = [
    {
      header: "Subject",
      cell: (row: (typeof allocations)[number]) => row.subject,
    },
    {
      header: "Teacher",
      cell: (row: (typeof allocations)[number]) => row.teacher,
    },
    {
      header: "Class",
      cell: (row: (typeof allocations)[number]) => row.className,
    },
  ];

  const allocationRecords = allocations.map((row) => ({
    id: row.id,
    lines: [
      { label: "Subject", value: row.subject },
      { label: "Teacher", value: row.teacher },
      { label: "Class", value: row.className },
    ],
  }));

  /**
   * Reads a page of classes and a page of allocations again.
   */
  const reload = React.useCallback(
    async (nextClassPage: number, nextAllocationPage: number) => {
      const { listAllocationsAction, listClassesAction } = await import(
        "@/app/admin/actions"
      );

      const [nextClasses, nextAllocations] = await Promise.all([
        listClassesAction(nextClassPage, CLASS_PAGE_SIZE),
        listAllocationsAction(nextAllocationPage, ALLOCATION_PAGE_SIZE),
      ]);

      if (nextClasses.ok) setClasses(nextClasses.data.rows);
      if (nextAllocations.ok) setAllocations(nextAllocations.data.rows);
    },
    [],
  );

  const saveClass = async (values: {
    id?: string;
    name: string;
    sortOrder: number;
    gradingMode: "GPA" | "GRADE_ONLY";
    classTeacherId: string;
  }) => {
    const result = await saveClassAction({
      id: values.id,
      name: values.name,
      sortOrder: values.sortOrder,
      gradingMode: values.gradingMode,
      classTeacherId: values.classTeacherId,
    });

    if (!result.ok) {
      toast({
        title: "Class not saved",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setClassModalOpen(false);
    await reload(classPage, allocationPage);

    toast({
      title: "Class saved",
      description: `${values.name} is now part of the school.`,
    });
  };

  const saveSubject = async (values: {
    subjectId: string;
    teacherId: string;
    classId: string;
    subjectName: string;
    teacherName: string;
    className: string;
  }) => {
    const result = await assignSubjectAction({
      classId: values.classId,
      subjectId: values.subjectId,
      teacherId: values.teacherId,
    });

    if (!result.ok) {
      toast({
        title: "Subject not assigned",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setSubjectModalOpen(false);
    await reload(classPage, allocationPage);

    toast({
      title: "Subject assigned",
      description: `${values.subjectName} is now taught by ${values.teacherName} in ${values.className}.`,
    });
  };

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <AdminPageHeader
        title="Classes and Subjects"
        description={adminGreeting.context}
      />

      <Button
        type="button"
        className="h-[47px] w-[124px] shrink-0"
        onClick={() => setClassModalOpen(true)}
      >
        Add class
      </Button>

      <PortalTable
        caption="Classes"
        columns={classColumns}
        rows={classes}
        mobileRecords={classRecords}
        mobileRecordSize="uniform"
        footer={
          <AdminTableFooter
            records={classes.length}
            page={classPage}
            pageCount={classPageCount}
            onPageChange={(next) => {
              setClassPage(next);
              void reload(next, allocationPage);
            }}
            compact
          />
        }
      />

      <h3 className="text-title font-bold leading-[1.45] text-ink">
        Subject allocation
      </h3>

      <PortalTable
        caption="Subject allocation"
        columns={allocationColumns}
        rows={allocations}
        mobileRecords={allocationRecords}
        mobileRecordSize="uniform"
        footer={
          <AdminTableFooter
            records={allocations.length}
            page={allocationPage}
            pageCount={allocationPageCount}
            onPageChange={(next) => {
              setAllocationPage(next);
              void reload(classPage, next);
            }}
            compact
          />
        }
      />

      <Button
        type="button"
        className="h-[49px] w-[165px] shrink-0"
        onClick={() => setSubjectModalOpen(true)}
      >
        Assign subject
      </Button>

      {classModalOpen ? (
        <ClassModal
          classes={classes}
          teachers={teachers}
          onClose={() => setClassModalOpen(false)}
          onSave={saveClass}
        />
      ) : null}

      {subjectModalOpen ? (
        <SubjectModal
          subjects={subjects}
          teachers={teachers}
          classes={classOptions}
          onClose={() => setSubjectModalOpen(false)}
          onSave={saveSubject}
        />
      ) : null}
    </div>
  );
}
