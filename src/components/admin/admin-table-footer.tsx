"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface AdminTableFooterProps {
  /** Number of records shown in the table. */
  records: number;
  /**
   * Zero-based index of the visible page.
   * Omitted when the table holds every record.
   */
  page?: number;
  /** Number of pages the table holds. */
  pageCount?: number;
  /** Fired when the admin moves between pages. */
  onPageChange?: (page: number) => void;
  /**
   * Shortens the page list to "1  2  3  …  n".
   *
   * A table with many pages would otherwise draw a button for every page.
   */
  compact?: boolean;
  className?: string;
}

/**
 * The muted count line under an admin table.
 *
 * Figma draws "Showing 3 records    ‹  1  ›" inside every admin table
 * (2:9680, 2:9699, 2:10148, 2:11298, 2:11612 and 2:11631): a 13px muted
 * count with the page chevrons beside it, on one 19px line.
 *
 * When the table paginates, the chevrons and the page numbers become real
 * controls and sit on the same 19px line.
 */
export function AdminTableFooter({
  records,
  page,
  pageCount,
  onPageChange,
  compact = false,
  className,
}: AdminTableFooterProps) {
  const paginated = onPageChange !== undefined && page !== undefined;
  const pages = pageCount ?? 1;

  // A long roll is shortened to its first three pages and its last one.
  const visiblePages = React.useMemo(() => {
    if (!compact || pages <= 5) {
      return Array.from({ length: pages }, (_, index) => index);
    }

    return [0, 1, 2, pages - 1];
  }, [compact, pages]);

  if (!paginated) {
    return (
      <div
        className={cn(
          "mt-4 flex w-full flex-wrap items-center gap-4",
          className,
        )}
      >
        <p className="text-caption leading-[1.45] text-muted">
          Showing {records} records
          &nbsp;&nbsp;•&nbsp;&nbsp;‹&nbsp;&nbsp;1&nbsp;&nbsp;›
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mt-4 flex w-full flex-nowrap items-center gap-2 md:gap-4",
        className,
      )}
    >
      <p className="min-w-0 flex-1 truncate whitespace-nowrap text-caption leading-[1.45] text-muted">
        Showing {records} records
      </p>

      <nav aria-label="Pagination" className="flex shrink-0 items-center gap-1">
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
            {compact && position === 3 && pages > 5 ? (
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
          disabled={page >= pages - 1}
          onClick={() => onPageChange(page + 1)}
          className="flex size-[18px] items-center justify-center rounded-[6px] text-caption leading-[1.45] text-ink transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 md:size-5"
        >
          ›
        </button>
      </nav>
    </div>
  );
}
