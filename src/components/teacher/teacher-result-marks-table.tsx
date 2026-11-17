"use client";

import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TeacherMarkError, TeacherResultRow } from "@/types/teacher";

export interface TeacherResultMarksTableProps {
  /** Rows rendered in the table. */
  rows: readonly TeacherResultRow[];
  /** Errors of the sheet, keyed by row id. */
  errors: Readonly<Record<string, TeacherMarkError>>;
  /** Fired with the row id and the new mark when a mark is typed. */
  onMarksChange: (rowId: string, marks: string) => void;
  /** Fired when the reader moves between pages. */
  onPageChange: (page: number) => void;
  /** Zero-based index of the visible page. */
  page: number;
  /** Number of pages in the class. */
  pageCount: number;
  /** Total number of students on the roll. */
  totalStudents: number;
  /** The sheet is published, so the marks cannot be changed. */
  readOnly?: boolean;
  className?: string;
}

/**
 * The editable marks table.
 *
 * Figma "Data table" (2:7968 desktop, 2:8114 tablet, 2:8253 mobile) and its
 * validation twin (2:8426 / 2:8575 / 2:8717):
 *
 * - Desktop (1440): a 518px panel with four equal columns — roll, student,
 *   marks and grade. The header is 43px tall and a body row is 62px, so the
 *   rows sit on a 78px pitch.
 * - Tablet (768): the same 518px panel with 149px columns.
 * - Mobile (375): a 799px panel where each student becomes a 130px record of
 *   three labelled lines and the mark field, 8px apart.
 *
 * The mark field is a 38px bordered box on desktop and tablet and a 46px box
 * on mobile, where it also carries the "Marks / 100" label. Figma draws only
 * the grade, so the GPA the portal needs is a muted line under it.
 *
 * The grade and the GPA of a row are the ones the server worked out, so the
 * table shows the numbers the sheet stores and not a second calculation in
 * the browser.
 */
export function TeacherResultMarksTable({
  rows,
  errors,
  onMarksChange,
  onPageChange,
  page,
  pageCount,
  totalStudents,
  readOnly = false,
  className,
}: TeacherResultMarksTableProps) {
  const columnWidth = `calc((100% - 12px) / 4)`;

  return (
    <div
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      {/* Tablet and desktop — four equal columns. */}
      <table className="hidden w-full table-fixed border-separate border-spacing-0 text-left md:table">
        <caption className="sr-only">Marks of the selected class</caption>
        <colgroup>
          {["Roll", "Student", "Marks / 100", "Grade"].map((header) => (
            <col key={header} style={{ width: columnWidth }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {["Roll", "Student", "Marks / 100", "Grade"].map((header) => (
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
          {rows.map((row, index) => {
            const error = errors[row.id];

            return (
              <tr key={row.id}>
                <td
                  className={cn(
                    "border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink",
                    index === rows.length - 1 && "border-b-0",
                  )}
                >
                  {row.roll}
                </td>
                <td
                  className={cn(
                    "border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink",
                    index === rows.length - 1 && "border-b-0",
                  )}
                >
                  {row.name}
                </td>
                <td
                  className={cn(
                    "border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top",
                    index === rows.length - 1 && "border-b-0",
                  )}
                >
                  <div className="relative w-full">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={row.marks}
                      disabled={readOnly}
                      aria-label={`Marks of ${row.name}`}
                      aria-invalid={error ? true : undefined}
                      onChange={(event) => onMarksChange(row.id, event.target.value)}
                      className={cn(
                        "h-[38px] w-full rounded-[8px] border bg-surface px-[9px] text-body-md leading-[1.45] text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        error ? "border-danger pr-[29px]" : "border-border",
                        readOnly && "cursor-default opacity-70",
                      )}
                    />
                    {error ? (
                      <AlertTriangle
                        aria-hidden
                        className="pointer-events-none absolute right-[9px] top-1/2 size-4 -translate-y-1/2 text-danger"
                      />
                    ) : null}
                  </div>
                </td>
                <td
                  className={cn(
                    "border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[20px] text-ink",
                    index === rows.length - 1 && "border-b-0",
                  )}
                >
                  {error ? (
                    <span className="text-danger">Invalid</span>
                  ) : (
                    row.grade
                  )}
                  {error ? null : (
                    <span className="mt-px block text-micro leading-4 text-muted">
                      {row.gpa ? `GPA ${row.gpa}` : ""}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile — each student becomes a stacked record. */}
      <ul className="flex w-full flex-col md:hidden">
        {rows.map((row) => {
          const error = errors[row.id];

          return (
            <li
              key={row.id}
              className="flex w-full flex-col border-b-[16px] border-transparent last:border-b-0"
            >
              <p className="text-body-md leading-5 text-ink">
                Roll:&nbsp;&nbsp;{row.roll}
              </p>
              <p className="mt-2 text-body-md leading-5 text-ink">
                Student:&nbsp;&nbsp;{row.name}
              </p>
              <p className="mt-2 text-body-md leading-5 text-ink">
                Grade:&nbsp;&nbsp;
                {error ? (
                  <span className="text-danger">Invalid</span>
                ) : (
                  row.grade
                )}
              </p>

              <div
                className={cn(
                  "relative mt-2 flex h-[46px] w-full items-center rounded-[8px] border bg-surface px-[13px]",
                  error ? "border-danger" : "border-border",
                  readOnly && "opacity-70",
                )}
              >
                <span className="shrink-0 text-body-md leading-5 text-ink">
                  Marks / 100:
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={row.marks}
                  disabled={readOnly}
                  aria-label={`Marks of ${row.name}`}
                  aria-invalid={error ? true : undefined}
                  onChange={(event) => onMarksChange(row.id, event.target.value)}
                  className="ml-1.5 min-w-0 flex-1 bg-transparent text-body-md leading-5 text-ink outline-none"
                />
                {error ? (
                  <AlertTriangle
                    aria-hidden
                    className="pointer-events-none absolute right-[9px] top-1/2 size-4 -translate-y-1/2 text-danger"
                  />
                ) : (
                  <span className="shrink-0 text-micro leading-4 text-muted">
                    {row.gpa ? `GPA ${row.gpa}` : ""}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex w-full flex-wrap items-center gap-4">
        <p className="text-caption leading-[1.45] text-muted">
          Showing {rows.length} records&nbsp;&nbsp;&nbsp;&nbsp;‹&nbsp;&nbsp;
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-current={index === page ? "page" : undefined}
              onClick={() => onPageChange(index)}
              className={cn(
                "px-1 text-caption leading-[1.45] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                index === page
                  ? "font-semibold text-primary"
                  : "text-muted hover:text-ink",
              )}
            >
              {index + 1}
            </button>
          ))}
          &nbsp;&nbsp;›
        </p>
      </div>

      <span className="sr-only">
        Showing {rows.length} of {totalStudents} students
      </span>
    </div>
  );
}
