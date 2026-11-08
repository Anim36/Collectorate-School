"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface DataTableColumn<TRow> {
  /** Column header copy. */
  readonly header: string;
  /** Value rendered for a row. */
  readonly cell: (row: TRow) => React.ReactNode;
  /** Extra classes for the header and body cells. */
  readonly className?: string;
}

export interface DataTableProps<TRow> {
  /** Column definitions. */
  readonly columns: readonly DataTableColumn<TRow>[];
  /** Rows for the current page. */
  readonly rows: readonly TRow[];
  /** Accessible name for the table. */
  readonly caption: string;
  /** Total number of records across all pages. */
  readonly totalRecords: number;
  /** Zero-based index of the visible page. */
  readonly page: number;
  /** Number of records per page. */
  readonly pageSize: number;
  /** Fired when the reader moves between pages. */
  readonly onPageChange?: (page: number) => void;
  className?: string;
}

/**
 * Data table with pagination.
 * Figma "Data table / With pagination" (2:17437–2:17436): surface background,
 * 1px border, 12px radius, 24px padding, a tinted semibold header row,
 * 14px body rows and a 13px muted pagination footer.
 */
export function DataTable<TRow>({
  columns,
  rows,
  caption,
  totalRecords,
  page,
  pageSize,
  onPageChange,
  className,
}: DataTableProps<TRow>) {
  const pageCount = Math.max(1, Math.ceil(totalRecords / pageSize));
  const firstRecord = totalRecords === 0 ? 0 : page * pageSize + 1;
  const lastRecord = Math.min(totalRecords, (page + 1) * pageSize);

  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-4 overflow-hidden rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-tint">
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={cn(
                  "px-3 py-3 text-caption font-semibold leading-[1.45] text-ink",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={cn(
                    "px-3 py-3 text-body-md leading-[1.45] text-ink",
                    column.className,
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        <p className="text-caption leading-[1.45] text-muted">
          Showing {firstRecord}–{lastRecord} of {totalRecords} records
        </p>

        <nav aria-label={`${caption} pagination`} className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => onPageChange?.(page - 1)}
            className="flex size-11 items-center justify-center rounded-[12px] border border-border bg-surface text-ink transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>

          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-current={index === page ? "page" : undefined}
              onClick={() => onPageChange?.(index)}
              className={cn(
                "flex size-11 items-center justify-center rounded-[12px] border text-body-md font-medium leading-[1.45] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                index === page
                  ? "border-transparent bg-action text-white"
                  : "border-border bg-surface text-ink hover:bg-tint",
              )}
            >
              {index + 1}
            </button>
          ))}

          <button
            type="button"
            aria-label="Next page"
            disabled={page >= pageCount - 1}
            onClick={() => onPageChange?.(page + 1)}
            className="flex size-11 items-center justify-center rounded-[12px] border border-border bg-surface text-ink transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}
