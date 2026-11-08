"use client";

import * as React from "react";

import { FilterField } from "@/components/shared/filter-field";
import { PortalTable } from "@/components/shared/portal-table";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { TeacherPageHeader } from "@/components/teacher/teacher-page-header";
import { teacherGreeting } from "@/data/teacher";
import {
  filterTeacherNoticeRows,
  teacherNoticeAudiences,
  type TeacherNoticeRow,
} from "@/data/teacher-notices";

/**
 * The teacher notice board.
 *
 * Figma "Teacher / Notice" (light 2:8753 desktop, 2:8899 tablet, 2:9013 mobile
 * and the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px heading, the 76px audience filter
 *   and the 308px notices table.
 * - Tablet (768): the table grows to 328px because the first headline wraps
 *   onto a second line.
 * - Mobile (375): 24px padding and a 365px table of stacked records.
 *
 * The audience filter is the teacher's own addition: the teacher sees the
 * notices addressed to the teachers, to the students and to everyone.
 */
export function TeacherNotice() {
  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Notice");

  const [audience, setAudience] = React.useState<string>(
    teacherNoticeAudiences[0],
  );

  const visibleRows = filterTeacherNoticeRows(audience);

  const columns = [
    { header: "Date", cell: (row: TeacherNoticeRow) => row.date },
    { header: "Category", cell: (row: TeacherNoticeRow) => row.category },
    { header: "Notice", cell: (row: TeacherNoticeRow) => row.notice },
  ];

  const mobileRecords = visibleRows.map((row) => ({
    id: row.id,
    lines: [
      { label: "Date", value: row.date },
      { label: "Category", value: row.category },
      { label: "Notice", value: row.notice },
    ],
  }));

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <TeacherPageHeader title="Notice" description={teacherGreeting.context} />

      <div className="flex w-full flex-col items-start">
        <FilterField
          label="Audience"
          options={teacherNoticeAudiences}
          value={audience}
          onValueChange={setAudience}
          className="md:w-[360px]"
        />
      </div>

      <PortalTable
        caption="Notices for teachers"
        columns={columns}
        rows={visibleRows}
        mobileRecords={mobileRecords}
        mobileRecordSize="uniform"
      />
    </div>
  );
}
