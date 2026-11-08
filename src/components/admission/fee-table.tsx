import { cn } from "@/lib/utils";

export interface FeeTableRow {
  /** Name of the fee line, e.g. "Admission fee". */
  fee: string;
  /** Amount for the Classes 6–8 band. */
  classes6to8: string;
  /** Amount for the Classes 9–10 band. */
  classes9to10: string;
}

export interface FeeTableProps {
  /** Rows rendered in the table. */
  rows: readonly FeeTableRow[];
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
 * the other shared tables: py-3 cells with a 16px transparent bottom border
 * and (100% - 12px) / 3 columns.
 *
 * On mobile the same rows stack as labelled records (2:872–2:882): a
 * "Fee: …" headline, one line per band and a divider under each record.
 */
export function FeeTable({ rows, caption, className }: FeeTableProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      {/* Tablet and desktop — three equal columns with a tinted header row. */}
      <table className="hidden w-full table-fixed border-separate border-spacing-0 text-left md:table">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col className="w-[calc((100%_-_12px)/3)]" />
          <col className="w-[calc((100%_-_12px)/3)]" />
          <col className="w-[calc((100%_-_12px)/3)]" />
        </colgroup>
        <thead>
          <tr>
            <th
              scope="col"
              className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
            >
              Fee
            </th>
            <th
              scope="col"
              className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
            >
              Classes 6–8
            </th>
            <th
              scope="col"
              className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
            >
              Classes 9–10
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.fee}>
              <td className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                {row.fee}
              </td>
              <td className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                {row.classes6to8}
              </td>
              <td className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                {row.classes9to10}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile — each fee becomes a stacked record with a divider. */}
      <ul className="flex w-full flex-col gap-4 md:hidden">
        {rows.map((row) => (
          <li key={row.fee} className="w-full">
            <p className="text-body font-semibold leading-[1.45] text-ink">
              Fee:&nbsp;&nbsp;{row.fee}
            </p>
            <p className="mt-2 text-caption leading-[1.45] text-ink">
              Classes 6–8:&nbsp;&nbsp;{row.classes6to8}
            </p>
            <p className="mt-2 text-caption leading-[1.45] text-ink">
              Classes 9–10:&nbsp;&nbsp;{row.classes9to10}
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
