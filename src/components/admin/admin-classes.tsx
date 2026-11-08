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
  adminClassRows,
  adminGreeting,
  adminSubjectAllocations,
  type AdminClass,
  type AdminSubjectAllocation,
} from "@/data/admin";

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
 * Everything happens in memory: the new classes, the edited classes and the
 * new subject allocations are held in the page state.
 */
export function AdminClasses() {
  const { toast } = useToast();

  // The top bar names the section, as Figma draws it: "Admin Panel / Classes
  // and Subjects", which wraps onto two lines on the tablet bar.
  useSetPortalSection("Classes and Subjects");

  const [classes, setClasses] = React.useState<readonly AdminClass[]>(
    adminClassRows,
  );
  const [allocations, setAllocations] = React.useState<
    readonly AdminSubjectAllocation[]
  >(adminSubjectAllocations);
  const [classModalOpen, setClassModalOpen] = React.useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = React.useState(false);

  const classColumns = [
    { header: "Class", cell: (row: AdminClass) => row.name },
    {
      header: "Sections",
      cell: (row: AdminClass) => row.sections.join(", "),
    },
    { header: "Students", cell: (row: AdminClass) => String(row.students) },
    { header: "Class teacher", cell: (row: AdminClass) => row.classTeacher },
  ];

  const classRecords = classes.map((row) => ({
    id: row.id,
    lines: [
      { label: "Class", value: row.name },
      { label: "Sections", value: row.sections.join(", ") },
      { label: "Students", value: String(row.students) },
      { label: "Class teacher", value: row.classTeacher },
    ],
  }));

  const allocationColumns = [
    {
      header: "Subject",
      cell: (row: AdminSubjectAllocation) => row.subject,
    },
    {
      header: "Teacher",
      cell: (row: AdminSubjectAllocation) => row.teacher,
    },
    {
      header: "Classes",
      cell: (row: AdminSubjectAllocation) => row.classes,
    },
  ];

  const allocationRecords = allocations.map((row) => ({
    id: row.id,
    lines: [
      { label: "Subject", value: row.subject },
      { label: "Teacher", value: row.teacher },
      { label: "Classes", value: row.classes },
    ],
  }));

  const saveClass = (values: {
    name: string;
    sections: string[];
    students: number;
    classTeacher: string;
  }) => {
    setClasses((previous) => [
      ...previous,
      {
        id: `class-${previous.length + 1}`,
        name: values.name,
        sections: values.sections,
        students: values.students,
        classTeacher: values.classTeacher,
      },
    ]);

    setClassModalOpen(false);

    toast({
      title: "Class saved",
      description: `${values.name} now runs ${values.sections.length} section(s).`,
    });
  };

  const saveSubject = (values: {
    subject: string;
    teacher: string;
    classes: string;
  }) => {
    setAllocations((previous) => [
      ...previous,
      {
        id: `subject-${previous.length + 1}`,
        subject: values.subject,
        teacher: values.teacher,
        classes: values.classes,
      },
    ]);

    setSubjectModalOpen(false);

    toast({
      title: "Subject assigned",
      description: `${values.subject} is now taught by ${values.teacher}.`,
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
        footer={<AdminTableFooter records={classes.length} />}
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
        footer={<AdminTableFooter records={allocations.length} />}
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
          onClose={() => setClassModalOpen(false)}
          onSave={saveClass}
        />
      ) : null}

      {subjectModalOpen ? (
        <SubjectModal
          onClose={() => setSubjectModalOpen(false)}
          onSave={saveSubject}
        />
      ) : null}
    </div>
  );
}
