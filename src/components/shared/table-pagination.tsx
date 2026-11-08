"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface TablePaginationProps {
  /** Number of records matching the filters. */
  totalRecords: number;
  /** Zero-based index of the visible page. */
  page: number;
  /** Number of records per page. */
  pageSize: number;
  /** Fired when the reader moves between pages. */
  onPageChange: (page: number) => void;
  /**
   * Replaces the default "Showing 1–n" count.
   *
   * Figma's admin table draws "Showing 1–4 of 1,560 users" under the table,
   * so the count names the whole roll rather than the filtered one.
   */
  readonly summary?: string;
  /**
   * Shortens the page list to "1  2  3  …  n".
   *
   * Figma draws the admin page controls that way when the roll is long.
   */
  readonly compact?: boolean;
  className?: string;
}

/**
 * The portal table pagination.
 *
 * Figma "Showing 1–3     ‹  1  ›" (2:5508 desktop, 2:5539 tablet, 2:5585
 * mobile): a 13px muted count on the leading edge and the page controls
 * beside it. The controls are the public notice board's pagination
 * (Figma "Data table" 2:1556), drawn on the same line so the row keeps
 * Figma's 19px height.
 */
export function TablePagination({
  totalRecords,
  page,
  pageSize,
  onPageChange,
  summary,
  compact = false,
  className,
}: TablePaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalRecords / pageSize));
  const firstRecord = totalRecords === 0 ? 0 : page * pageSize + 1;
  const lastRecord = Math.min(totalRecords, (page + 1) * pageSize);

  // A long roll is shortened to its first three pages and its last one.
  const visiblePages = React.useMemo(() => {
    if (!compact || pageCount <= 5) {
      return Array.from({ length: pageCount }, (_, index) => index);
    }

    return [0, 1, 2, pageCount - 1];
  }, [compact, pageCount]);

  return (
    <div
      className={cn(
        // The row never wraps: Figma draws the count and the page controls on
        // one 19px line, so the count gives way instead of the controls.
        "mt-4 flex w-full flex-nowrap items-center gap-2 md:gap-4",
        className,
      )}
    >
      <p className="min-w-0 flex-1 truncate whitespace-nowrap text-caption leading-[1.45] text-muted">
        {summary ?? `Showing ${firstRecord}–${lastRecord}`}
      </p>

      <nav
        aria-label="Pagination"
        className="flex shrink-0 items-center gap-0.5 md:gap-1"
      >
        <button
          type="button"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          className="flex size-[18px] items-center justify-center rounded-[6px] text-caption leading-[1.45] text-ink transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 md:size-5"
        >
          ‹
        </button>

        {visiblePages.map((index, position) => (
          <React.Fragment key={index}>
            {compact && position === 3 && pageCount > 5 ? (
              <span className="flex size-[18px] items-center justify-center text-caption leading-[1.45] text-muted md:size-5">
                …
              </span>
            ) : null}
            <button
              type="button"
              aria-current={index === page ? "page" : undefined}
              onClick={() => onPageChange(index)}
              className={cn(
                "flex size-[18px] items-center justify-center rounded-[6px] text-caption leading-[1.45] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:size-5",
                index === page ? "bg-action text-white" : "text-ink hover:bg-tint",
              )}
            >
              {index + 1}
            </button>
          </React.Fragment>
        ))}

        <button
          type="button"
          aria-label="Next page"
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(page + 1)}
          className="flex size-[18px] items-center justify-center rounded-[6px] text-caption leading-[1.45] text-ink transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 md:size-5"
        >
          ›
        </button>
      </nav>
    </div>
  );
}
