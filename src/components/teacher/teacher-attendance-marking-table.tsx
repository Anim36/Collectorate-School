"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";
import type {
  TeacherAttendanceStatus,
  TeacherStudentRow,
} from "@/types/teacher";

export interface TeacherAttendanceMarkingTableProps {
  /** Title line above the rows. */
  title: string;
  /** Students shown on this page. */
  students: readonly TeacherStudentRow[];
  /** Marks of the students, keyed by student id. */
  marks: Readonly<Record<string, TeacherAttendanceStatus>>;
  /** Fired with the student id and the new status when a choice is picked. */
  onMarkChange: (studentId: string, status: TeacherAttendanceStatus) => void;
  /** Fired when the reader moves between pages. */
  onPageChange: (page: number) => void;
  /** Zero-based index of the visible page. */
  page: number;
  /** Number of pages in the roll. */
  pageCount: number;
  /** Total number of students on the roll. */
  totalStudents: number;
  /** The sheet is a saved sheet, so the choices are read-only. */
  readOnly?: boolean;
  className?: string;
}

/** The three choices a teacher can mark a student with. */
const CHOICES: readonly {
  value: TeacherAttendanceStatus;
  label: string;
}[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
];

/**
 * The attendance marking table.
 *
 * Figma "Attendance marking table" (2:7000 desktop, 2:7182 tablet, 2:7358
 * mobile):
 *
 * - Desktop (1440): a 379px panel. Each student is a 39px row: a 32px
 *   portrait, the roll and name, and three 180.48px choices on the trailing
 *   edge. The rows sit on a 55px pitch.
 * - Tablet (768): the same 379px panel with 105.6px choices.
 * - Mobile (375): each student becomes a 77px card — the identity on the
 *   first line and the three 87.67px choices 16px below it.
 *
 * The choices are 39px tall on desktop and tablet and 29px on mobile, where
 * the label is a 13px caption.
 */
export function TeacherAttendanceMarkingTable({
  title,
  students,
  marks,
  onMarkChange,
  onPageChange,
  page,
  pageCount,
  totalStudents,
  readOnly = false,
  className,
}: TeacherAttendanceMarkingTableProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <p className="text-caption leading-[1.45] text-ink">{title}</p>

      {/* Tablet and desktop — one row per student. */}
      <ul className="mt-4 hidden w-full flex-col md:flex">
        {students.map((student) => {
          const status = marks[student.id] ?? "present";

          return (
            <li
              key={student.id}
              className="flex w-full items-center gap-4 border-b-[16px] border-transparent last:border-b-0"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Image
                  src={student.photo}
                  alt={student.photoAlt}
                  width={32}
                  height={32}
                  className="size-8 shrink-0 rounded-full object-cover"
                />
                <span className="truncate text-body-md leading-[1.45] text-ink">
                  {student.roll}&nbsp;&nbsp;{student.name}
                </span>
              </div>

              <div className="flex w-[332.8px] shrink-0 items-center gap-2 xl:w-[557.44px]">
                {CHOICES.map((choice) => {
                  const selected = status === choice.value;

                  return (
                    <button
                      key={choice.value}
                      type="button"
                      disabled={readOnly}
                      aria-pressed={selected}
                      onClick={() => onMarkChange(student.id, choice.value)}
                      className={cn(
                        "flex h-[39px] flex-1 items-center justify-center rounded-[8px] border text-caption leading-[1.45] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "border-primary bg-tint font-semibold text-primary"
                          : "border-border bg-surface text-ink hover:bg-tint",
                        readOnly && "cursor-default",
                      )}
                    >
                      {choice.label}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Mobile — each student becomes a stacked card. */}
      <ul className="mt-4 flex w-full flex-col md:hidden">
        {students.map((student) => {
          const status = marks[student.id] ?? "present";

          return (
            <li
              key={student.id}
              className="flex w-full flex-col border-b-[16px] border-transparent last:border-b-0"
            >
              <div className="flex w-full items-center gap-3">
                <Image
                  src={student.photo}
                  alt={student.photoAlt}
                  width={32}
                  height={32}
                  className="size-8 shrink-0 rounded-full object-cover"
                />
                <span className="truncate text-body-md leading-[1.45] text-ink">
                  {student.roll}&nbsp;&nbsp;{student.name}
                </span>
              </div>

              <div className="mt-4 flex w-full items-center gap-2">
                {CHOICES.map((choice) => {
                  const selected = status === choice.value;

                  return (
                    <button
                      key={choice.value}
                      type="button"
                      disabled={readOnly}
                      aria-pressed={selected}
                      onClick={() => onMarkChange(student.id, choice.value)}
                      className={cn(
                        "flex h-[29px] flex-1 items-center justify-center rounded-[8px] border text-caption leading-[1.45] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "border-primary bg-tint font-semibold text-primary"
                          : "border-border bg-surface text-ink hover:bg-tint",
                        readOnly && "cursor-default",
                      )}
                    >
                      {choice.label}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex w-full flex-wrap items-center gap-4">
        <p className="text-caption leading-[1.45] text-muted">
          ‹&nbsp;&nbsp;
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
        Showing {students.length} of {totalStudents} students
      </span>
    </div>
  );
}
