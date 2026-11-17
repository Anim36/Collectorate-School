"use client";

import * as React from "react";

import { FilterField } from "@/components/shared/filter-field";
import { PortalTable } from "@/components/shared/portal-table";
import { TablePagination } from "@/components/shared/table-pagination";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { TeacherPageHeader } from "@/components/teacher/teacher-page-header";
import { useToast } from "@/hooks/use-toast";
import { listTeacherNoticesAction } from "@/app/teacher/actions";
import type {
  TeacherNoticeAudience,
  TeacherNoticeList,
  TeacherNoticeRow,
} from "@/types/teacher";

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
 *
 * The notices come from the database and the filter runs on the server, so
 * the count under the table is the number of notices that really match.
 */
export function TeacherNotice({ initial }: { initial: TeacherNoticeList }) {
  const { toast } = useToast();

  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Notice");

  const [audience, setAudience] = React.useState<TeacherNoticeAudience>(
    initial.audience,
  );
  const [rows, setRows] = React.useState<readonly TeacherNoticeRow[]>(
    initial.rows,
  );
  const [total, setTotal] = React.useState(initial.total);
  const [page, setPage] = React.useState(initial.page);
  const [pageCount, setPageCount] = React.useState(initial.pageCount);

  /**
   * Reads the board from the server with the audience that is set.
   */
  const load = React.useCallback(
    async (nextAudience: TeacherNoticeAudience, nextPage: number) => {
      const result = await listTeacherNoticesAction({
        audience: nextAudience,
        page: nextPage,
      });

      if (!result.ok) {
        toast({
          title: "Could not load the notices",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setRows(result.data.rows);
      setTotal(result.data.total);
      setPage(result.data.page);
      setPageCount(result.data.pageCount);
    },
    [toast],
  );

  // The board is read again when the filter changes.
  React.useEffect(() => {
    void load(audience, 0);
  }, [audience, load]);

  const columns = [
    { header: "Date", cell: (row: TeacherNoticeRow) => row.date },
    { header: "Category", cell: (row: TeacherNoticeRow) => row.category },
    { header: "Notice", cell: (row: TeacherNoticeRow) => row.notice },
  ];

  const mobileRecords = rows.map((row) => ({
    id: row.id,
    lines: [
      { label: "Date", value: row.date },
      { label: "Category", value: row.category },
      { label: "Notice", value: row.notice },
    ],
  }));

  // The page is clamped rather than reset in an effect, so a filter change
  // never renders a frame of the previous page.
  const currentPage = Math.min(page, Math.max(1, pageCount) - 1);

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <TeacherPageHeader title="Notice" description={initial.context} />

      <div className="flex w-full flex-col items-start">
        <FilterField
          label="Audience"
          options={initial.audiences}
          value={audience}
          onValueChange={(value) => setAudience(value as TeacherNoticeAudience)}
          className="md:w-[360px]"
        />
      </div>

      <PortalTable
        caption="Notices for teachers"
        columns={columns}
        rows={rows}
        mobileRecords={mobileRecords}
        mobileRecordSize="uniform"
        footer={
          <TablePagination
            totalRecords={total}
            page={currentPage}
            pageSize={initial.pageSize}
            onPageChange={(nextPage) => {
              setPage(nextPage);
              void load(audience, nextPage);
            }}
          />
        }
      />
    </div>
  );
}
