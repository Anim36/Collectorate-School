"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/data/student";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** A single day cell of the calendar grid. */
interface CalendarCell {
  /** Day of the month, or null for a day outside the month. */
  day: number | null;
  /** Attendance status of the day, when the month carries one. */
  status: AttendanceStatus | null;
}

/**
 * Builds the five-week grid of days for the given month.
 * Figma always draws five week rows, padding the last one with empty cells.
 */
function buildMonthGrid(
  year: number,
  month: number,
  statuses: ReadonlyMap<number, AttendanceStatus>,
): CalendarCell[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ day: null, status: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, status: statuses.get(day) ?? null });
  }

  while (cells.length < 35) {
    cells.push({ day: null, status: null });
  }
  while (cells.length > 35) {
    cells.pop();
  }

  return cells;
}

/** The letter Figma prints in a day cell for each attendance status. */
function statusLetter(status: AttendanceStatus): string {
  switch (status) {
    case "present":
      return "P";
    case "absent":
      return "A";
    case "late":
      return "L";
    case "holiday":
      return "—";
    default:
      return "";
  }
}

/** The colour class of the letter that marks a day's status. */
function statusClass(status: AttendanceStatus | null): string {
  switch (status) {
    case "present":
      return "text-success";
    case "absent":
      return "text-danger";
    case "late":
      return "text-warning";
    case "holiday":
      return "text-muted";
    default:
      return "text-ink";
  }
}

export interface AttendanceCalendarProps {
  /** Year the month belongs to. */
  year: number;
  /** Month number, 1–12. */
  month: number;
  /** Attendance status of each day of the month. */
  statuses: ReadonlyMap<number, AttendanceStatus>;
  className?: string;
}

/**
 * Attendance calendar.
 * Figma "Attendance calendar" (2:4199 desktop, 2:4336 tablet, 2:4493 mobile):
 *
 * - Desktop (1440): a 549px card with 25px padding, a 19px weekday header
 *   and five 80px week rows.
 * - Tablet (768): a 549px card with 25px padding and five 80px week rows.
 * - Mobile (375): a 405px card with 25px padding and five 52px week rows.
 *
 * Each cell carries the day number and, for a school day, a status letter.
 */
export function AttendanceCalendar({
  year,
  month,
  statuses,
  className,
}: AttendanceCalendarProps) {
  const cells = React.useMemo(
    () => buildMonthGrid(year, month, statuses),
    [year, month, statuses],
  );

  return (
    <div
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      {/* Weekday header. */}
      <div className="grid w-full grid-cols-7 gap-[4px] md:gap-[8px]">
        {WEEKDAYS.map((weekday) => (
          <p
            key={weekday}
            className="text-caption font-semibold leading-[1.45] text-muted"
          >
            {weekday}
          </p>
        ))}
      </div>

      {/* Week rows. */}
      <div className="mt-4 flex w-full flex-col gap-[16px] md:gap-[16px]">
        {Array.from({ length: 5 }, (_, weekIndex) => (
          <div
            key={weekIndex}
            className="grid w-full grid-cols-7 gap-[4px] md:gap-[8px]"
          >
            {cells.slice(weekIndex * 7, weekIndex * 7 + 7).map((cell, dayIndex) => (
              <div
                key={`${cell.day ?? "empty"}-${dayIndex}`}
                className="flex h-[52px] flex-col items-start gap-1 px-[2px] md:h-[80px] md:px-[8px]"
              >
                <span className="text-caption leading-[1.45] text-ink md:text-body-md">
                  {cell.day ?? ""}
                </span>
                {cell.status ? (
                  <span
                    className={cn(
                      "text-caption font-semibold leading-[1.45]",
                      statusClass(cell.status),
                    )}
                  >
                    {statusLetter(cell.status)}
                    <span className="sr-only">
                      {" "}
                      — {cell.status}
                    </span>
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
