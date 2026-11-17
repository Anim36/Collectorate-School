import Link from "next/link";

import { TablePagination } from "@/components/shared/table-pagination";
import { cn } from "@/lib/utils";
import type { PublicNoticeRow } from "@/types/public";

export interface NoticeBoardTableProps {
  /** Notices rendered in the current view. */
  notices: readonly PublicNoticeRow[];
  /** Number of notices matching the filters. */
  totalRecords: number;
  /** Zero-based index of the visible page. */
  page: number;
  /** Number of records per page. */
  pageSize: number;
  /** Fired when the reader moves between pages. */
  onPageChange?: (page: number) => void;
  className?: string;
}

/**
 * Notice board table.
 * Figma "Data table" (2:1520 desktop, 2:1621 tablet, 2:1718 mobile): a 1px
 * border with 24px padding, a 43px tinted header row and body rows 16px
 * apart. Every column is (100% - 12px) / 4 wide, so a one-line row is 44px
 * tall and a two-line row is 64px tall.
 *
 * From tablet up the rows are a four-column table; on mobile each notice
 * becomes a stacked record (2:1719–2:1754) whose first line uses the 16px
 * body size and whose remaining lines use the 13px caption size.
 */
export function NoticeBoardTable({
  notices,
  totalRecords,
  page,
  pageSize,
  onPageChange,
  className,
}: NoticeBoardTableProps) {
  const pageCount = Math.max(1, Math.ceil(totalRecords / pageSize));
  const firstRecord = totalRecords === 0 ? 0 : page * pageSize + 1;
  const lastRecord = Math.min(totalRecords, (page + 1) * pageSize);

  return (
    <div
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      {/* Tablet and desktop — four equal columns with a tinted header row. */}
      <table className="hidden w-full table-fixed border-separate border-spacing-0 text-left md:table">
        <caption className="sr-only">Published notices</caption>
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
              Published
            </th>
            <th
              scope="col"
              className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
            >
              Category
            </th>
            <th
              scope="col"
              className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
            >
              Notice
            </th>
            <th
              scope="col"
              className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
            >
              Attachment
            </th>
          </tr>
        </thead>
        <tbody>
          {notices.map((notice) => (
            <tr key={notice.id}>
              <td className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                {notice.publishedLabel}
              </td>
              <td className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                {notice.category}
              </td>
              <td className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                <Link
                  href={`/notice/${notice.id}`}
                  className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {notice.title}
                </Link>
              </td>
              <td className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                {notice.attachments[0]
                  ? `${notice.attachments[0].format} · ${notice.attachments[0].size}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile — each notice becomes a stacked record with a divider. */}
      <ul className="flex w-full flex-col md:hidden">
        {notices.map((notice) => (
          <li
            key={notice.id}
            className="w-full border-t-[16px] border-transparent first:border-t-0"
          >
            <p className="text-body leading-[1.45] text-ink">
              Published:&nbsp;&nbsp;{notice.publishedLabel}
            </p>
            <p className="mt-2 text-caption leading-[1.45] text-ink">
              Category:&nbsp;&nbsp;{notice.category}
            </p>
            <p className="mt-2 text-caption leading-[1.45] text-ink">
              Notice:&nbsp;&nbsp;
              <Link
                href={`/notice/${notice.id}`}
                className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {notice.title}
              </Link>
            </p>
            <p className="mt-2 text-caption leading-[1.45] text-ink">
              Attachment:&nbsp;&nbsp;
              {notice.attachments[0]
                ? `${notice.attachments[0].format} · ${notice.attachments[0].size}`
                : "—"}
            </p>
            <div aria-hidden className="mt-2 h-px w-full bg-border" />
          </li>
        ))}
      </ul>

      {/* The count and the page controls share one 19px line, as Figma draws
          them, so the row never wraps on mobile. */}
      <TablePagination
        className="mt-4 md:mt-0"
        totalRecords={totalRecords}
        page={page}
        pageSize={pageSize}
        onPageChange={(next) => onPageChange?.(next)}
        summary={`Showing ${firstRecord}–${lastRecord}  •  Page ${page + 1} of ${pageCount}`}
      />
    </div>
  );
}
