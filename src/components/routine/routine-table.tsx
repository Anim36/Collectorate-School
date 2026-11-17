"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { getPublicRoutineAction } from "@/app/(public)/actions";
import { Button } from "@/components/ui/button";
import { FilterField } from "@/components/shared/filter-field";
import type { PublicRoutine, PublicRoutineClass } from "@/types/public";

/**
 * Weekly routine with the class filter.
 * Figma "Public / Routine" (light 2:2834 / 2:2961 / 2:3082 and the matching
 * dark frames).
 *
 * Desktop (2:2834): the filter dropdown sits where the two Figma filters
 * sat, at half the width of the row, the effective-date line follows at 8px
 * below, the timetable table shows a day column plus the eight periods, and
 * the footnote and download button close the block.
 * Tablet (2:2961): the same layout with a narrower table.
 * Mobile (2:3082): the filter stacks and the table becomes stacked records.
 *
 * The classes come from the database — the twelve the school teaches, from
 * Nursery to Class 10, each with its one group. There is no section: the
 * school runs one class per year, so the routine belongs to the class
 * alone. The timetable of the class the reader picks is read through the
 * read-only public action, and only a published routine is ever served.
 */
export function RoutineTable({
  classes,
  routine,
}: {
  classes: readonly PublicRoutineClass[];
  routine: PublicRoutine | null;
}) {
  const [selectedClass, setSelectedClass] = React.useState<string>(
    routine?.className ?? classes[0]?.name ?? "",
  );
  const [current, setCurrent] = React.useState<PublicRoutine | null>(routine);
  const [loading, setLoading] = React.useState(false);

  const changeClass = async (className: string) => {
    setSelectedClass(className);
    setLoading(true);
    setCurrent(null);

    const loaded = await getPublicRoutineAction(className);

    setCurrent(loaded);
    setLoading(false);
  };

  const days = current?.days ?? [];

  return (
    <div className="flex w-full flex-col items-start">
      {/* Filter. */}
      <div className="flex w-full flex-col items-start gap-4 md:flex-row">
        <FilterField
          label="Class"
          options={classes.map((entry) => entry.name)}
          value={selectedClass}
          onValueChange={changeClass}
          className="md:w-[calc((100%_-_16px)/2)]"
        />
      </div>

      <p className="mt-8 text-body leading-[1.45] text-muted">
        {selectedClass}
        {current ? ` • Effective ${current.effectiveFrom}` : ""}
        {loading ? " • Loading…" : ""}
      </p>

      {/* Timetable. */}
      <div className="mt-8 w-full overflow-x-auto rounded-[12px] border border-border bg-surface p-6 md:overflow-visible">
        <table className="hidden w-full table-fixed border-separate border-spacing-0 text-left md:table">
          <caption className="sr-only">
            Weekly routine for {selectedClass}
          </caption>
          {days.length > 0 ? (
            <>
              <colgroup>
                <col className="w-[calc((100%_-_12px)/9)]" />
                {days[0].periods.map((period) => (
                  <col
                    key={period.period}
                    className="w-[calc((100%_-_12px)/9)]"
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
                  >
                    Day
                  </th>
                  {days[0].periods.map((period) => (
                    <th
                      key={period.period}
                      scope="col"
                      className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
                    >
                      {period.period} · {period.time}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.day}>
                    <td className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                      {day.day}
                    </td>
                    {day.periods.map((period) => (
                      <td
                        key={period.period}
                        className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink"
                      >
                        {period.subject}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </>
          ) : null}
        </table>

        {/* Mobile — each day becomes a stacked record with a divider. */}
        <ul className="flex w-full flex-col md:hidden">
          {days.map((day) => (
            <li
              key={day.day}
              className="w-full border-t-[16px] border-transparent first:border-t-0"
            >
              <p className="text-body leading-[23px] text-ink">
                Day:&nbsp;&nbsp;{day.day}
              </p>
              {day.periods.map((period) => (
                <p
                  key={period.period}
                  className="mt-2 text-caption leading-[19px] text-ink"
                >
                  {period.period} · {period.time}:&nbsp;&nbsp;{period.subject}
                </p>
              ))}
              <div aria-hidden className="mt-[9px] h-px w-full bg-border" />
            </li>
          ))}
        </ul>

        {days.length > 0 ? (
          <p className="mt-4 w-full text-caption leading-[1.45] text-muted md:mt-0">
            Showing 1–{days.length}
            &nbsp;&nbsp;•&nbsp;&nbsp;Page 1 of 1&nbsp;&nbsp;&nbsp;&nbsp;‹&nbsp;&nbsp;1&nbsp;&nbsp;›
          </p>
        ) : null}
      </div>

      {!loading && days.length === 0 ? (
        <p className="mt-8 text-body leading-[1.45] text-muted">
          The routine of this class will appear here once the school publishes
          it.
        </p>
      ) : (
        <p className="mt-8 text-caption leading-[1.45] text-muted">
          The periods of the week, exactly as the school teaches them.
        </p>
      )}

      <Button type="button" className="mt-8">
        <Download aria-hidden className="size-4" />
        Download routine
      </Button>
    </div>
  );
}
