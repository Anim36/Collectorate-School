"use client";

import * as React from "react";
import { FilterX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateFilterField } from "@/components/shared/date-filter-field";
import { FilterField } from "@/components/shared/filter-field";
import { NoticeBoardTable } from "@/components/notice/notice-board-table";
import {
  noticeCategories,
  noticeDefaultRange,
  notices,
} from "@/data/notices";

const PAGE_SIZE = 6;

/** Formats an ISO date the way the Figma filter shows it. */
function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Notice board with filters.
 * Figma "Public / Notice" (light 2:1480 / 2:1587 / 2:1688 and the matching
 * dark frames): a category dropdown with a from-date and a to-date control
 * beside the results table. The sidebar stacks on mobile, sits in one row on
 * tablet and moves to a left column on desktop.
 */
export function NoticeBoard() {
  const [category, setCategory] = React.useState<string>(
    noticeCategories[0],
  );
  const [fromDate, setFromDate] = React.useState<string>(
    noticeDefaultRange.from,
  );
  const [toDate, setToDate] = React.useState<string>(noticeDefaultRange.to);
  const [page, setPage] = React.useState(0);

  const filteredNotices = React.useMemo(() => {
    const from = fromDate ? Date.parse(fromDate) : Number.NEGATIVE_INFINITY;
    const to = toDate ? Date.parse(toDate) : Number.POSITIVE_INFINITY;

    return notices.filter((notice) => {
      const published = Date.parse(notice.publishedOn);
      const matchesCategory =
        category === noticeCategories[0] || notice.category === category;
      const matchesRange = published >= from && published <= to;
      return matchesCategory && matchesRange;
    });
  }, [category, fromDate, toDate]);

  React.useEffect(() => {
    setPage(0);
  }, [category, fromDate, toDate]);

  const visibleNotices = filteredNotices.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE,
  );

  const clearFilters = () => {
    setCategory(noticeCategories[0]);
    setFromDate(noticeDefaultRange.from);
    setToDate(noticeDefaultRange.to);
  };

  return (
    <div className="flex w-full flex-col items-start gap-8 xl:flex-row xl:gap-6">
      {/* Filters — a left column on desktop, a row on tablet, stacked on mobile. */}
      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:gap-4 xl:w-[260px] xl:shrink-0 xl:flex-col xl:gap-4">
        <FilterField
          label="Category"
          options={noticeCategories}
          value={category}
          onValueChange={setCategory}
          className="md:w-[224px] xl:w-full"
        />

        <DateFilterField
          label="From date"
          value={fromDate}
          displayValue={formatLongDate(fromDate)}
          onValueChange={setFromDate}
          className="md:w-[224px] xl:w-full"
        />

        <DateFilterField
          label="To date"
          value={toDate}
          displayValue={formatLongDate(toDate)}
          onValueChange={setToDate}
          className="md:w-[224px] xl:w-full"
        />
      </div>

      {/* Results. */}
      <div className="flex w-full flex-col items-start gap-8 xl:flex-1">
        {visibleNotices.length > 0 ? (
          <NoticeBoardTable
            notices={visibleNotices}
            totalRecords={filteredNotices.length}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            className="w-full"
          />
        ) : (
          <div className="flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6">
            {/* Figma draws the heading on one 29px line, so it is sized to the
                narrowest column the board draws. */}
            <h2 className="text-[19px] font-semibold leading-[29px] text-ink">
              No notices match your filters
            </h2>
            <p className="mt-4 text-body leading-[1.45] text-muted">
              Try a different category or date range.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-4 h-[49px] w-[141px] shrink-0"
              onClick={clearFilters}
            >
              <FilterX aria-hidden className="size-4" />
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
