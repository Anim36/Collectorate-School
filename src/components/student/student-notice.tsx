"use client";

import Link from "next/link";
import * as React from "react";

import { PortalTable } from "@/components/shared/portal-table";
import { TablePagination } from "@/components/shared/table-pagination";
import { StudentNoticeEmptyState } from "@/components/student/student-notice-empty-state";
import { StudentNoticeFilters } from "@/components/student/student-notice-filters";
import { StudentPageHeader } from "@/components/student/student-page-header";
import { cn } from "@/lib/utils";
import {
  formatLongNoticeDate,
  noticeCategories,
  studentNoticeDefaultRange,
  studentNotices,
  type Notice,
} from "@/data/notices";

const PAGE_SIZE = 3;

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
 */
export function StudentNotice({ className }: { className?: string }) {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>(noticeCategories[0]);
  const [fromDate, setFromDate] = React.useState<string>(
    studentNoticeDefaultRange.from,
  );
  const [toDate, setToDate] = React.useState<string>(
    studentNoticeDefaultRange.to,
  );
  const [page, setPage] = React.useState(0);

  const filteredNotices = React.useMemo(() => {
    const from = fromDate ? Date.parse(fromDate) : Number.NEGATIVE_INFINITY;
    const to = toDate ? Date.parse(toDate) : Number.POSITIVE_INFINITY;
    const needle = query.trim().toLowerCase();

    return studentNotices.filter((notice) => {
      const published = Date.parse(notice.publishedOn);
      const matchesCategory =
        category === noticeCategories[0] || notice.category === category;
      const matchesRange = published >= from && published <= to;
      const matchesQuery =
        needle === "" ||
        notice.title.toLowerCase().includes(needle) ||
        notice.category.toLowerCase().includes(needle) ||
        notice.body.join(" ").toLowerCase().includes(needle);

      return matchesCategory && matchesRange && matchesQuery;
    });
  }, [category, fromDate, toDate, query]);

  // The page is clamped rather than reset in an effect, so a filter change
  // never renders a frame of the previous page.
  const pageCount = Math.max(1, Math.ceil(filteredNotices.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);

  const visibleNotices = filteredNotices.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );
  const columns = [
    { header: "Date", cell: (notice: Notice) => notice.shortLabel },
    { header: "Category", cell: (notice: Notice) => notice.category },
    {
      header: "Notice",
      cell: (notice: Notice) => (
        <Link
          href={`/student/notice/${notice.id}`}
          className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {notice.title}
        </Link>
      ),
    },
  ];

  const mobileRecords = visibleNotices.map((notice) => ({
    id: notice.id,
    lines: [
      { label: "Date", value: notice.shortLabel },
      { label: "Category", value: notice.category },
      { label: "Notice", value: notice.title },
    ],
  }));

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
        categories={noticeCategories}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        fromDateLabel={formatLongNoticeDate(fromDate)}
        toDate={toDate}
        onToDateChange={setToDate}
        toDateLabel={formatLongNoticeDate(toDate)}
      />

      <PortalTable
        caption="Published notices"
        columns={columns}
        rows={visibleNotices}
        mobileRecords={mobileRecords}
        footer={
          <TablePagination
            totalRecords={filteredNotices.length}
            page={currentPage}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        }
      />

      <StudentNoticeEmptyState />
    </div>
  );
}
