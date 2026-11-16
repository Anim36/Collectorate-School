"use client";

import Link from "next/link";
import * as React from "react";

import { PortalTable } from "@/components/shared/portal-table";
import { TablePagination } from "@/components/shared/table-pagination";
import { StudentNoticeEmptyState } from "@/components/student/student-notice-empty-state";
import { StudentNoticeFilters } from "@/components/student/student-notice-filters";
import { StudentPageHeader } from "@/components/student/student-page-header";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { listStudentNoticesAction } from "@/app/student/actions";
import type { StudentNoticeBoard, StudentNoticeRow } from "@/types/student";

/**
 * Student notice board.
 *
 * Figma "Student / Notice" (light 2:5442 desktop, 2:5512 tablet, 2:5564 mobile
 * and the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 46px heading, the context line and the
 *   308px results table.
 * - Tablet (768): 32px padding; the table grows to 348px because the first two
 *   headlines wrap onto a second line.
 * - Mobile (375): 24px padding and a 355px table of stacked records.
 *
 * The frame draws the results table straight under the heading, so the
 * filters are an addition to the Figma layout rather than a block of their
 * own. They follow the public board's filter pattern — Figma "Notice filters"
 * (2:1507–2:1518): a category dropdown and a date range, laid out in one row
 * from tablet up and stacked on mobile — with a free-text search in front.
 *
 * The notices come from the database, and the filters run on the server: the
 * page count under the table is the number of notices that really match.
 */
export function StudentNotice({
  board,
  className,
}: {
  /** The notice board the server read. */
  board: StudentNoticeBoard;
  className?: string;
}) {
  const { toast } = useToast();

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>(
    board.categories[0] ?? "All categories",
  );
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");
  const [page, setPage] = React.useState(board.page);
  const [rows, setRows] = React.useState(board.rows);
  const [total, setTotal] = React.useState(board.total);
  const [pageCount, setPageCount] = React.useState(board.pageCount);

  // The category the filter treats as "no category", so it is not sent as a
  // filter and the board keeps every notice.
  const allCategories = board.categories[0] ?? "All categories";

  // The board the server read carries the filters it was read with, so the
  // controls start on the values that produced it.
  React.useEffect(() => {
    setPage(board.page);
  }, [board.page]);

  /**
   * Reads the board from the server with the filters that are set.
   *
   * The page is sent along, so the page the reader is on is the page the
   * server reads.
   */
  const load = React.useCallback(
    async (nextPage: number) => {
      const result = await listStudentNoticesAction({
        query: query.trim() || undefined,
        category: category === allCategories ? undefined : category,
        from: fromDate || undefined,
        to: toDate || undefined,
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
      setPageCount(result.data.pageCount);
    },
    [query, category, fromDate, toDate, allCategories, toast],
  );

  // The board is read again when the filters change. The search waits for a
  // pause in the typing, so a word does not cost a query per letter.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      void load(0);
    }, 250);

    return () => clearTimeout(timer);
  }, [load]);

  const columns = [
    { header: "Date", cell: (notice: StudentNoticeRow) => notice.date },
    { header: "Category", cell: (notice: StudentNoticeRow) => notice.category },
    {
      header: "Notice",
      cell: (notice: StudentNoticeRow) => (
        <Link
          href={`/student/notice/${notice.id}`}
          className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {notice.title}
        </Link>
      ),
    },
  ];

  const mobileRecords = rows.map((notice) => ({
    id: notice.id,
    lines: [
      { label: "Date", value: notice.date },
      { label: "Category", value: notice.category },
      { label: "Notice", value: notice.title },
    ],
  }));

  // The page is clamped rather than reset in an effect, so a filter change
  // never renders a frame of the previous page.
  const currentPage = Math.min(page, Math.max(1, pageCount) - 1);

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8",
        className,
      )}
    >
      <StudentPageHeader
        title="Notice"
        description="Your school life, clearly organised."
      />

      <StudentNoticeFilters
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
        categories={board.categories}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        fromDateLabel={formatFilterDate(fromDate)}
        toDate={toDate}
        onToDateChange={setToDate}
        toDateLabel={formatFilterDate(toDate)}
      />

      <PortalTable
        caption="Published notices"
        columns={columns}
        rows={rows}
        mobileRecords={mobileRecords}
        footer={
          <TablePagination
            totalRecords={total}
            page={currentPage}
            pageSize={board.pageSize}
            onPageChange={(nextPage) => {
              setPage(nextPage);
              void load(nextPage);
            }}
          />
        }
      />

      {/* The empty state is only shown when there is really nothing to read:
          a board with notices on it never carries it. */}
      {rows.length === 0 ? <StudentNoticeEmptyState /> : null}
    </div>
  );
}

/**
 * Formats a date the way the filter shows it, e.g. "01 October 2026".
 *
 * An empty date shows a dash, so the control never reads "Invalid Date".
 */
function formatFilterDate(isoDate: string): string {
  if (!isoDate) return "—";

  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
