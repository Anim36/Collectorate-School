import { cn } from "@/lib/utils";
import type { NoticeAttachment } from "@/data/notices";

export interface AttachmentTableProps {
  /** Files attached to the notice. */
  attachments: readonly NoticeAttachment[];
  /** Accessible name for the table. */
  caption: string;
  className?: string;
}

/**
 * Attachment table.
 * Figma "Data table" (2:1819 desktop, 2:1889 tablet, 2:1955 mobile): a 1px
 * bordered surface with 24px padding, a 43px tinted header row and 44px body
 * rows. From tablet up the files sit in three columns; on mobile each file
 * becomes a stacked record (2:1956–2:1965).
 */
export function AttachmentTable({
  attachments,
  caption,
  className,
}: AttachmentTableProps) {
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
              className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint px-3 py-3 text-caption font-semibold leading-[1.45] text-ink"
            >
              Document
            </th>
            <th
              scope="col"
              className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint px-3 py-3 text-caption font-semibold leading-[1.45] text-ink"
            >
              Format
            </th>
            <th
              scope="col"
              className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint px-3 py-3 text-caption font-semibold leading-[1.45] text-ink"
            >
              Size
            </th>
          </tr>
        </thead>
        <tbody>
          {attachments.map((attachment) => (
            <tr key={attachment.name}>
              <td className="border-b-[16px] border-transparent px-3 py-3 align-top text-body-md leading-[1.45] text-ink">
                {attachment.name}
              </td>
              <td className="border-b-[16px] border-transparent px-3 py-3 align-top text-body-md leading-[1.45] text-ink">
                {attachment.format}
              </td>
              <td className="border-b-[16px] border-transparent px-3 py-3 align-top text-body-md leading-[1.45] text-ink">
                {attachment.size}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile — each file becomes a stacked record with a divider. */}
      <ul className="flex w-full flex-col gap-4 md:hidden">
        {attachments.map((attachment) => (
          <li key={attachment.name} className="w-full">
            <p className="text-body font-medium leading-[1.45] text-ink">
              Document:&nbsp;&nbsp;{attachment.name}
            </p>
            <p className="mt-2 text-caption leading-[1.45] text-ink">
              Format:&nbsp;&nbsp;{attachment.format}
            </p>
            <p className="mt-2 text-caption leading-[1.45] text-ink">
              Size:&nbsp;&nbsp;{attachment.size}
            </p>
            <div aria-hidden className="mt-2 h-px w-full bg-border" />
          </li>
        ))}
      </ul>

      <p className="mt-4 w-full text-caption leading-[1.45] text-muted md:mt-0">
        Showing 1–{attachments.length}
        &nbsp;&nbsp;•&nbsp;&nbsp;Page 1 of 1&nbsp;&nbsp;&nbsp;&nbsp;‹&nbsp;&nbsp;1&nbsp;&nbsp;›
      </p>
    </div>
  );
}
