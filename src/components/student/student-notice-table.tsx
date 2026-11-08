import Link from "next/link";

import { cn } from "@/lib/utils";
import type { StudentNoticeRow } from "@/data/student";

export interface StudentNoticeTableProps {
  /** Notice rows rendered in the table. */
  rows: readonly StudentNoticeRow[];
  className?: string;
}

/**
 * Recent-notices table.
 * Figma "Data table" (2:3700 desktop, 2:3766 tablet, 2:3852 mobile): a 1px
 * border with 24px padding, a 43px tinted header row and body rows 16px
 * apart.
 *
 * - Desktop (1440): three 346.67px columns. A one-line row is 44px tall, so
 *   the rows sit on a 60px pitch.
 * - Tablet (768): three 202.67px columns, so the first two headlines wrap to
 *   two lines and their rows grow to 64px.
 * - Mobile (375): each notice becomes a stacked record — a 16px date line, a
 *   13px category line and a 13px headline line, 6px apart.
 *
 * The 16px row gap is a transparent border on the cells, which keeps the
 * rows on a 60px pitch without adding a table border.
 */
export function StudentNoticeTable({ rows, className }: StudentNoticeTableProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      {/* Tablet and desktop — three equal columns with a tinted header row. */}
      <table className="hidden w-full table-fixed border-separate border-spacing-0 text-left md:table">
        <caption className="sr-only">Recent notices</caption>
        <colgroup>
          <col className="w-[calc((100%_-_24px)/3)]" />
          <col className="w-[calc((100%_-_24px)/3)]" />
          <col className="w-[calc((100%_-_24px)/3)]" />
        </colgroup>
        <thead>
          <tr>
            {["Date", "Category", "Notice"].map((header) => (
              <th
                key={header}
                scope="col"
                className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id}>
              <td
                className={cn(
                  "border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink",
                  index === rows.length - 1 && "border-b-0",
                )}
              >
                {row.date}
              </td>
              <td
                className={cn(
                  "border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink",
                  index === rows.length - 1 && "border-b-0",
                )}
              >
                {row.category}
              </td>
              <td
                className={cn(
                  "border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink",
                  index === rows.length - 1 && "border-b-0",
                )}
              >
                <Link
                  href={`/notice/${row.id}`}
                  className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {row.title}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile — each notice becomes a stacked record with a divider. */}
      <ul className="flex w-full flex-col md:hidden">
        {rows.map((row) => (
          <li
            key={row.id}
            className="w-full border-t-[16px] border-transparent first:border-t-0"
          >
            <p className="text-body leading-[1.45] text-ink">
              Date:&nbsp;&nbsp;{row.date}
            </p>
            <p className="mt-1.5 text-caption leading-[1.45] text-ink">
              Category:&nbsp;&nbsp;{row.category}
            </p>
            <p className="mt-1.5 text-caption leading-[1.45] text-ink">
              Notice:&nbsp;&nbsp;
              <Link
                href={`/notice/${row.id}`}
                className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {row.title}
              </Link>
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex w-full flex-wrap items-center gap-4">
        <p className="text-caption leading-[1.45] text-muted">
          Showing 1–{rows.length}
          &nbsp;&nbsp;•&nbsp;&nbsp;‹&nbsp;&nbsp;1&nbsp;&nbsp;›
        </p>
      </div>
    </div>
  );
}
