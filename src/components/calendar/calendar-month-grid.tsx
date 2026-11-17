"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import type { CalendarEventKind } from "@/types/public";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** A day of the month, as the grid draws it. */
export interface MonthGridEvent {
  /** Day of the month the event falls on. */
  readonly day: number;
  /** Short label inside the cell. */
  readonly label: string;
  /** Kind of the event, used for the dot colour. */
  readonly kind: CalendarEventKind;
}

export interface CalendarMonthGridProps {
  /** Year the month belongs to. */
  year: number;
  /** Month the grid draws, 1–12. */
  month: number;
  /** Events shown in the grid. */
  events: readonly MonthGridEvent[];
  className?: string;
}

/** Returns the five-week grid of days for the given month. */
function buildMonthGrid(
  year: number,
  month: number,
  events: readonly MonthGridEvent[],
): { day: number | null; label: string | null; kind: CalendarEventKind | null }[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: {
    day: number | null;
    label: string | null;
    kind: CalendarEventKind | null;
  }[] = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ day: null, label: null, kind: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const event = events.find((entry) => entry.day === day);
    cells.push({
      day,
      label: event?.label ?? null,
      kind: event?.kind ?? null,
    });
  }

  // Figma always draws five week rows (day cells 1–35).
  while (cells.length < 35) {
    cells.push({ day: null, label: null, kind: null });
  }
  while (cells.length > 35) {
    cells.pop();
  }

  return cells;
}

/** Returns the colour class of the dot that marks an event. */
export function eventDotClass(kind: CalendarEventKind | null): string {
  switch (kind) {
    case "Exam":
      return "bg-danger";
    case "Holiday":
      return "bg-amber";
    case "School event":
      return "bg-sky";
    default:
      return "bg-transparent";
  }
}

/**
 * The month grid of the academic calendar.
 *
 * Figma "Public / Academic Calendar" (light 2:2379 / 2:2535 / 2:2686 and the
 * matching dark frames): seven weekday labels over a grid of day cells. The
 * week rows are 96px tall from tablet up and 48px on mobile, and an event
 * shows a coloured dot beside its label.
 *
 * The admin calendar reuses the same grid, so the two pages stay in step.
 */
export function CalendarMonthGrid({
  year,
  month,
  events,
  className,
}: CalendarMonthGridProps) {
  const cells = React.useMemo(
    () => buildMonthGrid(year, month, events),
    [year, month, events],
  );

  return (
    <div
      className={cn(
        "mt-8 w-full rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((weekday) => (
          <p
            key={weekday}
            className="text-caption font-semibold leading-[1.45] text-muted md:text-caption"
          >
            {weekday}
          </p>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-7 gap-y-4">
        {cells.map((cell, index) => (
          <div
            key={`${cell.day ?? "empty"}-${index}`}
            className="flex min-h-[48px] flex-col items-start gap-1 p-1 text-ink md:min-h-[96px] md:p-2"
          >
            <span className="text-caption leading-[1.45] md:text-body-md">
              {cell.day ?? ""}
            </span>
            {cell.label ? (
              <span className="flex w-full items-start gap-1.5">
                <span
                  aria-hidden
                  className={cn(
                    "mt-1 size-1.5 shrink-0 rounded-full",
                    eventDotClass(cell.kind),
                  )}
                />
                <span className="hidden text-caption leading-[1.45] text-muted md:inline">
                  {cell.label}
                </span>
                <span className="sr-only">
                  {cell.label} — {cell.kind}
                </span>
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The name of a month, as the calendar controls show it. */
export function monthName(month: number): string {
  return MONTH_NAMES[month - 1];
}
