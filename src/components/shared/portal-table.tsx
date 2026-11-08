import { cn } from "@/lib/utils";

export interface PortalTableColumn<TRow> {
  /** Column header copy. */
  readonly header: string;
  /** Value rendered for a row. */
  readonly cell: (row: TRow) => React.ReactNode;
}

export interface PortalTableProps<TRow> {
  /** Column definitions. */
  readonly columns: readonly PortalTableColumn<TRow>[];
  /** Rows rendered in the table. */
  readonly rows: readonly TRow[];
  /** Accessible name for the table. */
  readonly caption: string;
  /**
   * Records rendered on mobile, where each row becomes a stacked record.
   * Every entry is one labelled line.
   */
  readonly mobileRecords?: readonly {
    readonly id: string;
    readonly lines: readonly {
      readonly label: string;
      readonly value: React.ReactNode;
    }[];
  }[];
  /**
   * Rhythm of the mobile records.
   *
   * - "default" (2:3700): the first line uses the 16px body size and the rest
   *   the 13px caption size, 6px apart.
   * - "uniform" (2:6806): every line uses the 14px body size, 8px apart.
   */
  readonly mobileRecordSize?: "default" | "uniform";
  /**
   * Column widths, as a share of the table width.
   *
   * Omitted when every column is the same width, which is what Figma draws
   * everywhere except where a column carries a long value — a table that holds
   * an invoice number and a receipt number needs a wider column for each, so
   * the row keeps its 44px height on every screen.
   */
  readonly columnWidths?: readonly string[];
  /**
   * Fired when a reader opens a row.
   * A table whose rows open something passes this; the rows become
   * clickable on desktop and mobile alike.
   */
  readonly onRowClick?: (row: TRow) => void;
  /**
   * Footer shown under the table.
   * Defaults to the muted "Showing 1–n  ‹ 1 ›" line; a page that paginates
   * passes its own footer with the page controls.
   */
  readonly footer?: React.ReactNode;
  className?: string;
}

/**
 * The shared portal table rhythm.
 *
 * Figma draws the student tables the same way everywhere: a 1px border with
 * 24px padding, a 43px tinted header row, 44px body rows on a 60px pitch and
 * a muted "Showing 1–n  ‹ 1 ›" footer.
 *
 * - Desktop (1440) and tablet (768): the rows are a table of equal columns.
 *   Figma measures each column from the 12px inset of its first cell, so the
 *   columns are (100% - 12px) / n wide.
 * - Mobile (375): each row becomes a stacked record whose first line uses
 *   the 16px body size and whose remaining lines use the 13px caption size,
 *   6px apart.
 */
export function PortalTable<TRow>({
  columns,
  rows,
  caption,
  mobileRecords,
  mobileRecordSize = "default",
  columnWidths,
  onRowClick,
  footer,
  className,
}: PortalTableProps<TRow>) {
  const columnWidth = `calc((100% - 12px) / ${columns.length})`;
  return (
    <div
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      {/* Tablet and desktop — equal columns with a tinted header row. */}
      <table className="hidden w-full table-fixed border-separate border-spacing-0 text-left md:table">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          {columns.map((column, index) => (
            <col
              key={column.header}
              style={{ width: columnWidths?.[index] ?? columnWidth }}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? "cursor-pointer" : undefined}
            >
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={cn(
                    "border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink",
                    index === rows.length - 1 && "border-b-0",
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile — each row becomes a stacked record. */}
      {mobileRecords ? (
        <ul className="flex w-full flex-col md:hidden">
          {mobileRecords.map((record, index) => (
            <li
              key={record.id}
              onClick={
                onRowClick ? () => onRowClick(rows[index]) : undefined
              }
              className={cn(
                "w-full border-t-[16px] border-transparent first:border-t-0",
                onRowClick && "cursor-pointer",
              )}
            >
              {record.lines.map((line, lineIndex) => (
                <p
                  key={line.label}
                  className={cn(
                    "text-ink",
                    mobileRecordSize === "uniform"
                      ? "text-body-md leading-5"
                      : lineIndex === 0
                        ? "text-body leading-[23px]"
                        : "mt-1.5 text-caption leading-[1.45]",
                    mobileRecordSize === "uniform" &&
                      lineIndex > 0 &&
                      "mt-2",
                  )}
                >
                  {line.label}:&nbsp;&nbsp;{line.value}
                </p>
              ))}
            </li>
          ))}
        </ul>
      ) : null}

      {footer ?? (
        <div className="mt-4 flex w-full flex-wrap items-center gap-4">
          <p className="text-caption leading-[1.45] text-muted">
            Showing 1–{rows.length}
            &nbsp;&nbsp;•&nbsp;&nbsp;‹&nbsp;&nbsp;1&nbsp;&nbsp;›
          </p>
        </div>
      )}
    </div>
  );
}
