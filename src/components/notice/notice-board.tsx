"use client";

import * as React from "react";
import { FilterX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateFilterField } from "@/components/shared/date-filter-field";
import { FilterField } from "@/components/shared/filter-field";
import { NoticeBoardTable } from "@/components/notice/notice-board-table";
import { listPublicNoticesAction } from "@/app/(public)/actions";

const PAGE_SIZE = 6;

/** Formats an ISO date the way the Figma filter shows it. */
function formatLongDate(isoDate: string): string {
  if (!isoDate) return "Any date";

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
 *
 * The filters and the pagination run on the server: the component asks the
 * read-only public action, and the count under the table is the number of
 * notices that really match. The board opens with no date range, so the
 * first page shows every notice the school has published.
 */
export function NoticeBoard() {
  const [category, setCategory] = React.useState<string>("All categories");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");
  const [page, setPage] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  // The search waits for the reader to stop typing, so the board does not
  // ask the server once per keystroke.
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  const searchId = React.useId();

  const [board, setBoard] = React.useState<Awaited<
    ReturnType<typeof listPublicNoticesAction>
  > | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;

    setLoading(true);

    listPublicNoticesAction({
      query: debouncedQuery || undefined,
      category: category === "All categories" ? "" : category,
      from: fromDate || undefined,
      to: toDate || undefined,
      page,
    }).then((result) => {
      if (alive) {
        setBoard(result);
        setLoading(false);
      }
    });

    return () => {
      alive = false;
    };
  }, [category, fromDate, toDate, page, debouncedQuery]);

  React.useEffect(() => {
    setPage(0);
  }, [category, fromDate, toDate, debouncedQuery]);

  const clearFilters = () => {
    setCategory("All categories");
    setFromDate("");
    setToDate("");
    setQuery("");
  };

  const rows = board?.rows ?? [];

  return (
    <div className="flex w-full flex-col items-start gap-8 xl:flex-row xl:gap-6">
      {/* Filters — a left column on desktop, a row on tablet, stacked on mobile. */}
      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:gap-4 xl:w-[260px] xl:shrink-0 xl:flex-col xl:gap-4">
        <div className="flex w-full flex-col items-start md:w-[224px] xl:w-full">
          <label
            htmlFor={searchId}
            className="text-caption font-medium leading-[1.45] text-muted"
          >
            Search notices
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by headline…"
            className="mt-2 flex h-[49px] w-full items-center rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <FilterField
          label="Category"
          options={board?.categories ?? ["All categories"]}
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
        {rows.length > 0 ? (
          <NoticeBoardTable
            notices={rows}
            totalRecords={board?.total ?? 0}
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
              {loading
                ? "Loading notices"
                : "No notices match your filters"}
            </h2>
            <p className="mt-4 text-body leading-[1.45] text-muted">
              {loading
                ? "One moment, the board is on its way."
                : "Try a different category or date range."}
            </p>
            {!loading ? (
              <Button
                type="button"
                variant="secondary"
                className="mt-4 h-[49px] w-[141px] shrink-0"
                onClick={clearFilters}
              >
                <FilterX aria-hidden className="size-4" />
                Clear filters
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
