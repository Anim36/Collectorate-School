"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getPublicCalendarMonthAction } from "@/app/(public)/actions";
import { Button } from "@/components/ui/button";
import { CalendarMonthGrid, eventDotClass } from "@/components/calendar/calendar-month-grid";
import { calendarEventKinds } from "@/types/public";
import type { PublicCalendarMonth } from "@/types/public";
import { cn } from "@/lib/utils";

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

/**
 * Academic calendar with month switching.
 * Figma "Public / Academic Calendar" (light 2:2379 / 2:2535 / 2:2686 and the
 * matching dark frames).
 *
 * Desktop (2:2379): the month control and the "Today" button share a 49px
 * row, the month grid is 629px tall with five 96px week rows, and the three
 * "Coming up this month" cards sit side by side.
 * Tablet (2:2535): the same layout, but the cards wrap into two rows.
 * Mobile (2:2686): the controls stack, the week rows shrink to 48px, and the
 * cards stack.
 *
 * The entries come from the database, one month at a time: the page hands
 * over the current month, and every switch asks the read-only public action
 * for the rows of the month the reader turned to.
 */
export function AcademicCalendar({
  initialMonth,
}: {
  initialMonth: PublicCalendarMonth;
}) {
  const [month, setMonth] = React.useState<PublicCalendarMonth>(initialMonth);

  const moveMonth = async (offset: number) => {
    const next = new Date(
      Date.UTC(month.year, month.month - 1 + offset, 1),
    );
    const year = next.getUTCFullYear();
    const monthNumber = next.getUTCMonth() + 1;

    setMonth({ year, month: monthNumber, events: [], highlights: [] });

    const loaded = await getPublicCalendarMonthAction(year, monthNumber);

    setMonth(loaded);
  };

  const goToToday = () => {
    const now = new Date();

    moveMonth(
      (now.getUTCFullYear() - month.year) * 12 +
        (now.getUTCMonth() + 1 - month.month),
    );
  };

  return (
    <div className="flex w-full flex-col items-start">
      {/* Month controls. */}
      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-center md:gap-6">
        <div className="flex h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] md:w-[203px] md:justify-start">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            aria-label="Previous month"
            className="flex size-6 items-center justify-center rounded-[6px] text-ink transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>

          <p
            aria-live="polite"
            className="text-body font-semibold leading-[1.45] text-ink"
          >
            {MONTH_NAMES[month.month - 1]} {month.year}
          </p>

          <button
            type="button"
            onClick={() => moveMonth(1)}
            aria-label="Next month"
            className="flex size-6 items-center justify-center rounded-[6px] text-ink transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>

        <Button type="button" variant="secondary" onClick={goToToday}>
          Today
        </Button>
      </div>

      {/* Month grid. */}
      <CalendarMonthGrid
        year={month.year}
        month={month.month}
        events={month.events}
      />

      {/* Legend. */}
      <p className="mt-8 flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-caption leading-[1.45] text-muted">
        {calendarEventKinds.map((kind) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn("size-2 rounded-full", eventDotClass(kind))}
            />
            {kind}
          </span>
        ))}
      </p>

      {/* Coming up. */}
      <h2 className="mt-8 text-title font-bold leading-[1.45] text-ink">
        Coming up this month
      </h2>

      <ul className="mt-8 grid w-full grid-cols-1 gap-8 md:grid-cols-2 md:gap-x-6 md:gap-y-8 xl:grid-cols-3">
        {month.highlights.map((highlight) => (
          <li key={highlight.heading} className="w-full">
            <article className="flex w-full flex-col items-start gap-4 rounded-[12px] border border-border bg-surface p-6">
              <h3 className="text-title font-semibold leading-[1.45] text-ink">
                {highlight.heading}
              </h3>
              <p className="text-body leading-[1.45] text-muted">
                {highlight.detail}
              </p>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
