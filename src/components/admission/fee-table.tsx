import { cn } from "@/lib/utils";
import type { PublicFeeRow } from "@/types/public";

export interface FeeTableProps {
  /**
   * One row per class, with the three fee amounts the school charges.
   * The rows come from the `fee_structures` table through the public fees
   * service; a class without a fee for the current year shows "—".
   */
  rows: readonly PublicFeeRow[];
  /** Accessible name for the table. */
  caption: string;
  className?: string;
}

/**
 * "Fees at a glance" table.
 * Figma "Data table" (2:690 desktop, 2:781 tablet, 2:871 mobile): a 1px
 * border, 24px padding (25px from the frame edge once the border is added),
 * a 43px tinted header row, 44px body rows 16px apart and a 19px muted
 * footer line 16px below the last row. The rows follow the same rhythm as
 * the other shared tables: py-3 cells with a 16px transparent bottom border.
 *
 * The Figma frame showed fee lines against two class bands; the real table
 * carries every class the school teaches, so the same chrome now holds one
 * row per class with its three amounts. The amounts are formatted in taka
 * from the integer poisha the database keeps.
 *
 * On mobile the same rows stack as labelled records (2:872–2:882): a
 * "Class: …" headline, one line per amount and a divider under each record.
 */
export function FeeTable({ rows, caption, className }: FeeTableProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      {/* Tablet and desktop — four columns with a tinted header row. */}
      <table className="hidden w-full table-fixed border-separate border-spacing-0 text-left md:table">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col className="w-[calc((100%_-_12px)/4)]" />
          <col className="w-[calc((100%_-_12px)/4)]" />
          <col className="w-[calc((100%_-_12px)/4)]" />
          <col className="w-[calc((100%_-_12px)/4)]" />
        </colgroup>
        <thead>
          <tr>
            <th
              scope="col"
              className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
            >
              Class
            </th>
            <th
              scope="col"
              className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
            >
              Admission fee
            </th>
            <th
              scope="col"
              className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
            >
              Monthly tuition
            </th>
            <th
              scope="col"
              className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
            >
              Annual activities
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.className}>
              <td className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                {row.className}
              </td>
              <td className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                {row.admission}
              </td>
              <td className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                {row.tuition}
              </td>
              <td className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                {row.activities}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile — each class becomes a stacked record with a divider. */}
      <ul className="flex w-full flex-col gap-4 md:hidden">
        {rows.map((row) => (
          <li key={row.className} className="w-full">
            <p className="text-body font-semibold leading-[1.45] text-ink">
              Class:&nbsp;&nbsp;{row.className}
            </p>
            <p className="mt-2 text-caption leading-[1.45] text-ink">
              Admission fee:&nbsp;&nbsp;{row.admission}
            </p>
            <p className="mt-2 text-caption leading-[1.45] text-ink">
              Monthly tuition:&nbsp;&nbsp;{row.tuition}
            </p>
            <p className="mt-2 text-caption leading-[1.45] text-ink">
              Annual activities:&nbsp;&nbsp;{row.activities}
            </p>
            <div aria-hidden className="mt-2 h-px w-full bg-border" />
          </li>
        ))}
      </ul>

      <p className="mt-4 w-full text-caption leading-[1.45] text-muted md:mt-0">
        Showing 1–{rows.length}
        &nbsp;&nbsp;•&nbsp;&nbsp;Page 1 of 1&nbsp;&nbsp;&nbsp;&nbsp;‹&nbsp;&nbsp;1&nbsp;&nbsp;›
      </p>
    </div>
  );
}
